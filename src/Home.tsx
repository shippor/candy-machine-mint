import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";


import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)`
  font-family: 'Poppins', sans-serif !important;
  background:#877a76 !important;
  box-shadow: 0px 0px 10px #fc384c;
  font-size: 15px;
  padding: 15px 50px !important;
  font-weight: 600;
  color: #E8E8E8 !important;
  border-radius: 50px !important;
  border: none;
  justify-content: center !important;
`;

const Header = styled.h1`
  font-size: 40px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 25px;
  margin: 0;
  color: #E8E8E8;
  text-shadow: 2px 2px 3px #2a3c46;
`;

const MintContainer = styled.div`
  display: flex;
  height: 100vh;
  padding: 0 20px;
  justify-content: center;
  align-items: center;
  background-image: url(//cdn.shopify.com/s/files/1/0549/5203/4347/files/phc-hero-bg.png?v=1635037022);
    background-color: #181818;
    background-size: 30% auto;
    background-position: top right;
    background-repeat: no-repeat;
`; // add your styles here

const MintInformation = styled.div`
  display: flex;
  background: linear-gradient( 90deg,#3860FC 0%,#B31AB1 100%) !important;
  flex-direction: column;
  text-align: center;
  padding: 42px 100px;
  border: 1px solid #7C87B6;
  border-radius: 15px;
  font-size: 28px;
`; // add your styles here

const MintButton = styled(Button)`
  font-family: 'Poppins', sans-serif !important;
  background:#877a76 !important;
  box-shadow: 0px 0px 10px #fc384c;
  font-size: 15px;
  padding: 15px 50px !important;
  font-weight: 600;
  color: #E8E8E8 !important;
  border-radius: 50px !important;
  border: none;
  justify-content: center;
`; // add your styles here

const CounterText = styled.span``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  //const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      //setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        console.log(balance);
        //setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        //const balance = await props.connection.getBalance(wallet.publicKey);
        //setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (
    <main>

      <MintContainer>
      <MintInformation>
          {!wallet ? (
            <div>
               <img src="//cdn.shopify.com/s/files/1/0549/5203/4347/files/logo_1_small.png?v=1634525019" alt="" title=""  data-description=""/>
              <Header>Connect to Mint</Header>
              <ConnectButton>Connect Wallet</ConnectButton>
            </div>
          ) : (
            <div>
              <img src="//cdn.shopify.com/s/files/1/0549/5203/4347/files/logo_1_small.png?v=1634525019" alt="" title=""  data-description=""/>
              <Header>Mint</Header>
              <p>Price - 0.49 SOL</p>
              {wallet && <p>Minted - {itemsRedeemed} / {itemsAvailable}</p>}
              <MintButton
                  disabled={isSoldOut || isMinting || !isActive}
                  onClick={onMint}
                  variant="contained"
              >
                {isSoldOut ? (
                    "SOLD OUT"
                ) : isActive ? (
                    isMinting ? (
                        <CircularProgress />
                    ) : (
                        "MINT"
                    )
                ) : (
                    <Countdown
                        date={startDate}
                        onMount={({ completed }) => completed && setIsActive(true)}
                        onComplete={() => setIsActive(true)}
                        renderer={renderCounter}
                    />
                )}
              </MintButton>
            </div>
          )}</MintInformation>
      </MintContainer>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
