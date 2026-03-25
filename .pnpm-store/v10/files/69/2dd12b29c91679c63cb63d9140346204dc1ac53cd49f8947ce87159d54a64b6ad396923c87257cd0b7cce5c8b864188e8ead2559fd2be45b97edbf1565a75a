"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsecuredJWT = void 0;
const base64url = require("../runtime/base64url.js");
const buffer_utils_js_1 = require("../lib/buffer_utils.js");
const errors_js_1 = require("../util/errors.js");
const jwt_claims_set_js_1 = require("../lib/jwt_claims_set.js");
const produce_js_1 = require("./produce.js");
class UnsecuredJWT extends produce_js_1.ProduceJWT {
    encode() {
        const header = base64url.encode(JSON.stringify({ alg: 'none' }));
        const payload = base64url.encode(JSON.stringify(this._payload));
        return `${header}.${payload}.`;
    }
    static decode(jwt, options) {
        if (typeof jwt !== 'string') {
            throw new errors_js_1.JWTInvalid('Unsecured JWT must be a string');
        }
        const { 0: encodedHeader, 1: encodedPayload, 2: signature, length } = jwt.split('.');
        if (length !== 3 || signature !== '') {
            throw new errors_js_1.JWTInvalid('Invalid Unsecured JWT');
        }
        let header;
        try {
            header = JSON.parse(buffer_utils_js_1.decoder.decode(base64url.decode(encodedHeader)));
            if (header.alg !== 'none')
                throw new Error();
        }
        catch {
            throw new errors_js_1.JWTInvalid('Invalid Unsecured JWT');
        }
        const payload = (0, jwt_claims_set_js_1.default)(header, base64url.decode(encodedPayload), options);
        return { payload, header };
    }
}
exports.UnsecuredJWT = UnsecuredJWT;
