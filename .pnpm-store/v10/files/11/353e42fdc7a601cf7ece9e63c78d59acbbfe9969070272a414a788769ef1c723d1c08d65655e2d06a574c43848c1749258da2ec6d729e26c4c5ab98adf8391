
const {
    HttpsRequest,
    ClientRequest
} = require('./request');

const globalManager = HttpsRequest.globalManager;
const request = globalManager.request.bind(globalManager);
const get = globalManager.get.bind(globalManager);

const https = Object.assign({},require('https'));

module.exports = Object.assign(https , {
    ClientRequest,
    globalManager,
    request,
    get
})