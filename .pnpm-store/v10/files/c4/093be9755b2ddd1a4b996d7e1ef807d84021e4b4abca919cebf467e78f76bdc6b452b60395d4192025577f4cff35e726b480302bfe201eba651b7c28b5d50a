"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../util/errors.js");
function checkP2s(p2s) {
    if (!(p2s instanceof Uint8Array) || p2s.length < 8) {
        throw new errors_js_1.JWEInvalid('PBES2 Salt Input must be 8 or more octets');
    }
}
exports.default = checkP2s;
