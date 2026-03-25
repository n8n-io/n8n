"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unwrap = exports.wrap = void 0;
const buffer_1 = require("buffer");
const crypto_1 = require("crypto");
const errors_js_1 = require("../util/errors.js");
const buffer_utils_js_1 = require("../lib/buffer_utils.js");
const webcrypto_js_1 = require("./webcrypto.js");
const crypto_key_js_1 = require("../lib/crypto_key.js");
const is_key_object_js_1 = require("./is_key_object.js");
const invalid_key_input_js_1 = require("../lib/invalid_key_input.js");
const ciphers_js_1 = require("./ciphers.js");
const is_key_like_js_1 = require("./is_key_like.js");
function checkKeySize(key, alg) {
    if (key.symmetricKeySize << 3 !== parseInt(alg.slice(1, 4), 10)) {
        throw new TypeError(`Invalid key size for alg: ${alg}`);
    }
}
function ensureKeyObject(key, alg, usage) {
    if ((0, is_key_object_js_1.default)(key)) {
        return key;
    }
    if (key instanceof Uint8Array) {
        return (0, crypto_1.createSecretKey)(key);
    }
    if ((0, webcrypto_js_1.isCryptoKey)(key)) {
        (0, crypto_key_js_1.checkEncCryptoKey)(key, alg, usage);
        return crypto_1.KeyObject.from(key);
    }
    throw new TypeError((0, invalid_key_input_js_1.default)(key, ...is_key_like_js_1.types, 'Uint8Array'));
}
const wrap = (alg, key, cek) => {
    const size = parseInt(alg.slice(1, 4), 10);
    const algorithm = `aes${size}-wrap`;
    if (!(0, ciphers_js_1.default)(algorithm)) {
        throw new errors_js_1.JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
    }
    const keyObject = ensureKeyObject(key, alg, 'wrapKey');
    checkKeySize(keyObject, alg);
    const cipher = (0, crypto_1.createCipheriv)(algorithm, keyObject, buffer_1.Buffer.alloc(8, 0xa6));
    return (0, buffer_utils_js_1.concat)(cipher.update(cek), cipher.final());
};
exports.wrap = wrap;
const unwrap = (alg, key, encryptedKey) => {
    const size = parseInt(alg.slice(1, 4), 10);
    const algorithm = `aes${size}-wrap`;
    if (!(0, ciphers_js_1.default)(algorithm)) {
        throw new errors_js_1.JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
    }
    const keyObject = ensureKeyObject(key, alg, 'unwrapKey');
    checkKeySize(keyObject, alg);
    const cipher = (0, crypto_1.createDecipheriv)(algorithm, keyObject, buffer_1.Buffer.alloc(8, 0xa6));
    return (0, buffer_utils_js_1.concat)(cipher.update(encryptedKey), cipher.final());
};
exports.unwrap = unwrap;
