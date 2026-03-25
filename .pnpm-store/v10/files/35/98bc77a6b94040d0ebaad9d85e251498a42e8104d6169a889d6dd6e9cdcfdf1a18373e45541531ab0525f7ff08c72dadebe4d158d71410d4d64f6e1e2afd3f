const http = require('http');
const h1Target = 'http://www.example.com/';

const req1 = http.request(h1Target, (res)=>{
    console.log(`
Url : ${h1Target}
Status : ${res.statusCode}
HttpVersion : ${res.httpVersion}
    `);
});
req1.end();