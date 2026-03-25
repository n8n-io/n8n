const PDF = require('./');
const fs = require('fs');

let PDF_FILE = './test/data/01-valid.pdf';
let dataBuffer = fs.readFileSync('./test/data/01-valid.pdf');
PDF(dataBuffer).then(function(data) {
    fs.writeFileSync(`${PDF_FILE}.txt`, data.text, {
        encoding: 'utf8',
        flag: 'w'
    });
    debugger;
}).catch(function(err) {
    debugger;
});
