const {
    HttpRequestManager , HTTP2OutgoingMessage,ClientRequest
} = require('./request');
const http = require('./http');
const https = require('./https');

const autoDetectManager = new HttpRequestManager();
HttpRequestManager.globalManager = autoDetectManager;
const request = autoDetectManager.request.bind(autoDetectManager);
const get = autoDetectManager.get.bind(autoDetectManager);


module.exports = {
    HTTP2OutgoingMessage,
    ClientRequest,
    globalManager : HttpRequestManager.globalManager ,
    request,
    get,
    http: http,
    https: https
}