const {request} = require('../lib/index');
const h1Target = 'http://www.example.com/';
const h2Target = 'https://www.example.com/';
const req1 = request(h1Target, (res)=>{
    console.log(`
Url : ${h1Target}
Status : ${res.statusCode}
HttpVersion : ${res.httpVersion}
    `);
});
req1.end();

const req2 = request(h2Target, (res)=>{
    console.log(`
Url : ${h2Target}
Status : ${res.statusCode}
HttpVersion : ${res.httpVersion}
    `);
});
req2.end();
