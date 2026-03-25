"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareRequest = void 0;
const cloneRequest_1 = require("./cloneRequest");
const constants_1 = require("./constants");
const prepareRequest = (request) => {
    request = typeof request.clone === "function" ? request.clone() : (0, cloneRequest_1.cloneRequest)(request);
    for (const headerName of Object.keys(request.headers)) {
        if (constants_1.GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
            delete request.headers[headerName];
        }
    }
    return request;
};
exports.prepareRequest = prepareRequest;
