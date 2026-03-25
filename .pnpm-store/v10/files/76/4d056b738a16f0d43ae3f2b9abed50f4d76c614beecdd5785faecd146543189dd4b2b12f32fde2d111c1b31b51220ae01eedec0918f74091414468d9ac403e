"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixRequestBody = fixRequestBody;
const querystring = require("querystring");
/**
 * Fix proxied body if bodyParser is involved.
 */
function fixRequestBody(proxyReq, req) {
    // skip fixRequestBody() when req.readableLength not 0 (bodyParser failure)
    if (req.readableLength !== 0) {
        return;
    }
    const requestBody = req.body;
    if (!requestBody) {
        return;
    }
    const contentType = proxyReq.getHeader('Content-Type');
    if (!contentType) {
        return;
    }
    const writeBody = (bodyData) => {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    };
    // Use if-elseif to prevent multiple writeBody/setHeader calls:
    // Error: "Cannot set headers after they are sent to the client"
    if (contentType.includes('application/json') || contentType.includes('+json')) {
        writeBody(JSON.stringify(requestBody));
    }
    else if (contentType.includes('application/x-www-form-urlencoded')) {
        writeBody(querystring.stringify(requestBody));
    }
    else if (contentType.includes('multipart/form-data')) {
        writeBody(handlerFormDataBodyData(contentType, requestBody));
    }
}
/**
 * format FormData data
 * @param contentType
 * @param data
 * @returns
 */
function handlerFormDataBodyData(contentType, data) {
    const boundary = contentType.replace(/^.*boundary=(.*)$/, '$1');
    let str = '';
    for (const [key, value] of Object.entries(data)) {
        str += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`;
    }
    return str;
}
