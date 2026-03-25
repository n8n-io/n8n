"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto_1 = require("crypto");
const check_modulus_length_js_1 = require("./check_modulus_length.js");
const webcrypto_js_1 = require("./webcrypto.js");
const crypto_key_js_1 = require("../lib/crypto_key.js");
const is_key_object_js_1 = require("./is_key_object.js");
const invalid_key_input_js_1 = require("../lib/invalid_key_input.js");
const is_key_like_js_1 = require("./is_key_like.js");
const checkKey = (key, alg) => {
    if (key.asymmetricKeyType !== 'rsa') {
        throw new TypeError('Invalid key for this operation, its asymmetricKeyType must be rsa');
    }
    (0, check_modulus_length_js_1.default)(key, alg);
};
const resolvePadding = (alg) => {
    switch (alg) {
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512':
            return crypto_1.constants.RSA_PKCS1_OAEP_PADDING;
        case 'RSA1_5':
            return crypto_1.constants.RSA_PKCS1_PADDING;
        default:
            return undefined;
    }
};
const resolveOaepHash = (alg) => {
    switch (alg) {
        case 'RSA-OAEP':
            return 'sha1';
        case 'RSA-OAEP-256':
            return 'sha256';
        case 'RSA-OAEP-384':
            return 'sha384';
        case 'RSA-OAEP-512':
            return 'sha512';
        default:
            return undefined;
    }
};
function ensureKeyObject(key, alg, ...usages) {
    if ((0, is_key_object_js_1.default)(key)) {
        return key;
    }
    if ((0, webcrypto_js_1.isCryptoKey)(key)) {
        (0, crypto_key_js_1.checkEncCryptoKey)(key, alg, ...usages);
        return crypto_1.KeyObject.from(key);
    }
    throw new TypeError((0, invalid_key_input_js_1.default)(key, ...is_key_like_js_1.types));
}
const encrypt = (alg, key, cek) => {
    const padding = resolvePadding(alg);
    const oaepHash = resolveOaepHash(alg);
    const keyObject = ensureKeyObject(key, alg, 'wrapKey', 'encrypt');
    checkKey(keyObject, alg);
    return (0, crypto_1.publicEncrypt)({ key: keyObject, oaepHash, padding }, cek);
};
exports.encrypt = encrypt;
const decrypt = (alg, key, encryptedKey) => {
    const padding = resolvePadding(alg);
    const oaepHash = resolveOaepHash(alg);
    const keyObject = ensureKeyObject(key, alg, 'unwrapKey', 'decrypt');
    checkKey(keyObject, alg);
    return (0, crypto_1.privateDecrypt)({ key: keyObject, oaepHash, padding }, encryptedKey);
};
exports.decrypt = decrypt;
