
const {
    HttpRequest,ClientRequest
} = require('./request');

const globalManager = HttpRequest.globalManager;
const request = globalManager.request.bind(globalManager);
const get = globalManager.get.bind(globalManager);

const http = Object.assign({},require('http'));

module.exports = Object.assign(http , {
    ClientRequest,
    globalManager,
    request,
    get
})