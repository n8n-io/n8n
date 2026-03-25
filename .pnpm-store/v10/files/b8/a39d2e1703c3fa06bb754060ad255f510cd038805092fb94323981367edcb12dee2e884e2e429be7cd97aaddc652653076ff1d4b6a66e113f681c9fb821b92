"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitLength = void 0;
const errors_js_1 = require("../util/errors.js");
const random_js_1 = require("../runtime/random.js");
function bitLength(alg) {
    switch (alg) {
        case 'A128GCM':
            return 128;
        case 'A192GCM':
            return 192;
        case 'A256GCM':
        case 'A128CBC-HS256':
            return 256;
        case 'A192CBC-HS384':
            return 384;
        case 'A256CBC-HS512':
            return 512;
        default:
            throw new errors_js_1.JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
    }
}
exports.bitLength = bitLength;
exports.default = (alg) => (0, random_js_1.default)(new Uint8Array(bitLength(alg) >> 3));
