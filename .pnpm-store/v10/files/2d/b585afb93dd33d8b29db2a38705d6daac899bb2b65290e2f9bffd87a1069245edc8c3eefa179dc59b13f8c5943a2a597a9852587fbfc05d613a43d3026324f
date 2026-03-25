"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompactSign = void 0;
const sign_js_1 = require("../flattened/sign.js");
class CompactSign {
    constructor(payload) {
        this._flattened = new sign_js_1.FlattenedSign(payload);
    }
    setProtectedHeader(protectedHeader) {
        this._flattened.setProtectedHeader(protectedHeader);
        return this;
    }
    async sign(key, options) {
        const jws = await this._flattened.sign(key, options);
        if (jws.payload === undefined) {
            throw new TypeError('use the flattened module for creating JWS with b64: false');
        }
        return `${jws.protected}.${jws.payload}.${jws.signature}`;
    }
}
exports.CompactSign = CompactSign;
