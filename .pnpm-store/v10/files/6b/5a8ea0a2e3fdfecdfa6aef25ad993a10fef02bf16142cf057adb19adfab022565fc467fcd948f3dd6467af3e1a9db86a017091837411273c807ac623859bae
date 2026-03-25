"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.PublicKey = exports.PrivateKey = exports.ECIES_CONFIG = void 0;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
var utils_1 = require("@noble/ciphers/utils");
var config_js_1 = require("./config.js");
var index_js_1 = require("./keys/index.js");
var types_js_1 = require("./types.js");
var index_js_2 = require("./utils/index.js");
/**
 * Encrypts data with a receiver's public key.
 * @description
 * In version 0.4.18, `Buffer` is returned when available, otherwise `Uint8Array`.
 * From version 0.5.0, this function will always return `Uint8Array`.
 * To preserve the pre-0.5.0 behavior of returning a `Buffer`, wrap the result with `Buffer.from(encrypt(...))`.
 *
 * @param receiverRawPK - Raw public key of the receiver, either as a hex `string` or a `Uint8Array`.
 * @param data - Data to encrypt.
 * @returns Encrypted payload, format: `public key || encrypted`.
 */
function encrypt(receiverRawPK, data) {
    var encrypted = _encrypt(receiverRawPK, data, config_js_1.ECIES_CONFIG);
    return types_js_1.IS_BUFFER_SUPPORTED ? Buffer.from(encrypted) : encrypted;
}
function _encrypt(receiverRawPK, data, config) {
    var curve = config.ellipticCurve;
    var ephemeralSK = new index_js_1.PrivateKey(undefined, curve);
    var receiverPK = receiverRawPK instanceof Uint8Array
        ? new index_js_1.PublicKey(receiverRawPK, curve)
        : index_js_1.PublicKey.fromHex(receiverRawPK, curve);
    var sharedKey = ephemeralSK.encapsulate(receiverPK, config.isHkdfKeyCompressed);
    var ephemeralPK = ephemeralSK.publicKey.toBytes(config.isEphemeralKeyCompressed);
    var encrypted = (0, index_js_2.symEncrypt)(sharedKey, data);
    return (0, utils_1.concatBytes)(ephemeralPK, encrypted);
}
/**
 * Decrypts data with a receiver's private key.
 * @description
 * In version 0.4.18, `Buffer` is returned when available, otherwise `Uint8Array`.
 * From version 0.5.0, this function will always return `Uint8Array`.
 * To preserve the pre-0.5.0 behavior of returning a `Buffer`, wrap the result with `Buffer.from(decrypt(...))`.
 *
 * @param receiverRawSK - Raw private key of the receiver, either as a hex `string` or a `Uint8Array`.
 * @param data - Data to decrypt.
 * @returns Decrypted plain text.
 */
function decrypt(receiverRawSK, data) {
    var decrypted = _decrypt(receiverRawSK, data);
    return types_js_1.IS_BUFFER_SUPPORTED ? Buffer.from(decrypted) : decrypted;
}
function _decrypt(receiverRawSK, data, config) {
    if (config === void 0) { config = config_js_1.ECIES_CONFIG; }
    var curve = config.ellipticCurve;
    var receiverSK = receiverRawSK instanceof Uint8Array
        ? new index_js_1.PrivateKey(receiverRawSK, curve)
        : index_js_1.PrivateKey.fromHex(receiverRawSK, curve);
    var keySize = config.ephemeralKeySize;
    var ephemeralPK = new index_js_1.PublicKey(data.subarray(0, keySize), curve);
    var encrypted = data.subarray(keySize);
    var sharedKey = ephemeralPK.decapsulate(receiverSK, config.isHkdfKeyCompressed);
    return (0, index_js_2.symDecrypt)(sharedKey, encrypted);
}
var config_js_2 = require("./config.js");
Object.defineProperty(exports, "ECIES_CONFIG", { enumerable: true, get: function () { return config_js_2.ECIES_CONFIG; } });
var index_js_3 = require("./keys/index.js");
Object.defineProperty(exports, "PrivateKey", { enumerable: true, get: function () { return index_js_3.PrivateKey; } });
Object.defineProperty(exports, "PublicKey", { enumerable: true, get: function () { return index_js_3.PublicKey; } });
/** @deprecated - use `import * as utils from "eciesjs/utils"` instead. */
exports.utils = {
    // TODO: remove these after 0.5.0
    aesEncrypt: index_js_2.aesEncrypt,
    aesDecrypt: index_js_2.aesDecrypt,
    symEncrypt: index_js_2.symEncrypt,
    symDecrypt: index_js_2.symDecrypt,
    decodeHex: index_js_2.decodeHex,
    getValidSecret: index_js_2.getValidSecret,
    remove0x: index_js_2.remove0x,
};
