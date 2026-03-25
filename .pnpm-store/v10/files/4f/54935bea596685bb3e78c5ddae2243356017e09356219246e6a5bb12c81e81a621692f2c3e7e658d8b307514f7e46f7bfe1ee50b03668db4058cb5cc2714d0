const path = require('path');
const fs = require('fs');
const axios = require('axios');

async function download(url, path) {
  const writer = fs.createWriteStream(path);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function downloadIso() {
  const url = 'https://www.currency-iso.org/dam/downloads/lists/list_one.xml';
  const path = 'iso-4217-list-one.xml';

  try {
    await download(url, path);

    console.log('Downloaded ' + url + ' to ' + path);
  } catch (e) {
    console.error('Error downloading ' + url);
    console.error(e);
    process.exit(1);
  }
}

downloadIso();
