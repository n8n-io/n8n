"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const https = require("https");
const events_1 = require("events");
const errors_js_1 = require("../util/errors.js");
const buffer_utils_js_1 = require("../lib/buffer_utils.js");
const fetchJwks = async (url, timeout, options) => {
    let get;
    switch (url.protocol) {
        case 'https:':
            get = https.get;
            break;
        case 'http:':
            get = http.get;
            break;
        default:
            throw new TypeError('Unsupported URL protocol.');
    }
    const { agent, headers } = options;
    const req = get(url.href, {
        agent,
        timeout,
        headers,
    });
    const [response] = (await Promise.race([(0, events_1.once)(req, 'response'), (0, events_1.once)(req, 'timeout')]));
    if (!response) {
        req.destroy();
        throw new errors_js_1.JWKSTimeout();
    }
    if (response.statusCode !== 200) {
        throw new errors_js_1.JOSEError('Expected 200 OK from the JSON Web Key Set HTTP response');
    }
    const parts = [];
    for await (const part of response) {
        parts.push(part);
    }
    try {
        return JSON.parse(buffer_utils_js_1.decoder.decode((0, buffer_utils_js_1.concat)(...parts)));
    }
    catch {
        throw new errors_js_1.JOSEError('Failed to parse the JSON Web Key Set HTTP response as JSON');
    }
};
exports.default = fetchJwks;
