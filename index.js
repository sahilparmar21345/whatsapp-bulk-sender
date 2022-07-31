const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const { time } = require('console');
require("dotenv").config()
const wppconnect = require('@wppconnect-team/wppconnect');


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID
const SHEET_NAME = process.env.SHEET_NAME
const SHEET_DATA_RANGE = process.env.SHEET_DATA_RANGE

function authorize_google(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
  
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getNewToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
  }
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error while trying to retrieve access token', err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) return console.error(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        callback(oAuth2Client);
      });
    });
}
var rows;
function listNumbers(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${SHEET_DATA_RANGE}`,
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      rows = res.data.values;
      if (rows.length) {
        console.log('Email, Whatsapp number:');
        console.log(`${rows[0][0]}, ${rows[0][1]}`);
        console.log(`${rows[1][0]}, ${rows[1][1]}`);
      } else {
        console.log('No data found.');
      }
    });
}
function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
const sendWhatsappMsgs = async () => {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize_google(JSON.parse(content), listNumbers);
    });
    while(rows == undefined){
      console.log("Waiting for data!")
      await sleep(3000)
    };
    if (!rows.length)
        return console.log("No emails found. Skipping whatsapp calls");
      try{
        const client = await wppconnect.create();
        for (let i = 0; i < rows.length; i++){
          try{
            const result = await client.sendText(`91${rows[i][1]}`, "Hello")
            console.log(`Sent message to ${result.to}`);
          } catch(err){
            console.log(err)
          }
        }
      } catch(e){
        console.log(e);
      }
    
};

sendWhatsappMsgs();