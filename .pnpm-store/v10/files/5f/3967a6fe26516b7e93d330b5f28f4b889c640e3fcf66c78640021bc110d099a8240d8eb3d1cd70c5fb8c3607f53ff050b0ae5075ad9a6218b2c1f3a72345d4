"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../util/errors.js");
const is_key_object_js_1 = require("./is_key_object.js");
const checkCekLength = (enc, cek) => {
    let expected;
    switch (enc) {
        case 'A128CBC-HS256':
        case 'A192CBC-HS384':
        case 'A256CBC-HS512':
            expected = parseInt(enc.slice(-3), 10);
            break;
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM':
            expected = parseInt(enc.slice(1, 4), 10);
            break;
        default:
            throw new errors_js_1.JOSENotSupported(`Content Encryption Algorithm ${enc} is not supported either by JOSE or your javascript runtime`);
    }
    if (cek instanceof Uint8Array) {
        const actual = cek.byteLength << 3;
        if (actual !== expected) {
            throw new errors_js_1.JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
        }
        return;
    }
    if ((0, is_key_object_js_1.default)(cek) && cek.type === 'secret') {
        const actual = cek.symmetricKeySize << 3;
        if (actual !== expected) {
            throw new errors_js_1.JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
        }
        return;
    }
    throw new TypeError('Invalid Content Encryption Key type');
};
exports.default = checkCekLength;
