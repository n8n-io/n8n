"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeProtectedHeader = void 0;
const base64url_js_1 = require("./base64url.js");
const buffer_utils_js_1 = require("../lib/buffer_utils.js");
const is_object_js_1 = require("../lib/is_object.js");
function decodeProtectedHeader(token) {
    let protectedB64u;
    if (typeof token === 'string') {
        const parts = token.split('.');
        if (parts.length === 3 || parts.length === 5) {
            ;
            [protectedB64u] = parts;
        }
    }
    else if (typeof token === 'object' && token) {
        if ('protected' in token) {
            protectedB64u = token.protected;
        }
        else {
            throw new TypeError('Token does not contain a Protected Header');
        }
    }
    try {
        if (typeof protectedB64u !== 'string' || !protectedB64u) {
            throw new Error();
        }
        const result = JSON.parse(buffer_utils_js_1.decoder.decode((0, base64url_js_1.decode)(protectedB64u)));
        if (!(0, is_object_js_1.default)(result)) {
            throw new Error();
        }
        return result;
    }
    catch {
        throw new TypeError('Invalid Token or Protected Header formatting');
    }
}
exports.decodeProtectedHeader = decodeProtectedHeader;
