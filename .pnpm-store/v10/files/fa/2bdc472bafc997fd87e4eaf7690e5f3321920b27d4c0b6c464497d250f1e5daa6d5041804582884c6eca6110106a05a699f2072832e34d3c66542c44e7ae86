'use strict';

const http = require('http');

const ours = {
    "default": "Default response",
    "1XX": "Informational",
    "103": "Early hints", // not in Node < 10
    "2XX": "Successful",
    "3XX": "Redirection",
    "4XX": "Client Error",
    "5XX": "Server Error",
    "7XX": "Developer Error" // April fools RFC
};

module.exports = {
    statusCodes: Object.assign({},ours,http.STATUS_CODES)
};

