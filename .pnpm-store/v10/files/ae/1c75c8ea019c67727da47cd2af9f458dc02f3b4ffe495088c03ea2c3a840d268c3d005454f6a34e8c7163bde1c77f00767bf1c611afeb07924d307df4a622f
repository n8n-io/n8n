"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aesDecrypt = exports.aesEncrypt = exports.symDecrypt = exports.symEncrypt = void 0;
var aes_1 = require("@ecies/ciphers/aes");
var chacha_1 = require("@ecies/ciphers/chacha");
var utils_1 = require("@noble/ciphers/utils");
var webcrypto_1 = require("@noble/ciphers/webcrypto");
var config_js_1 = require("../config.js");
var consts_js_1 = require("../consts.js");
var symEncrypt = function (key, plainText, AAD) {
    return _exec(_encrypt, config_js_1.ECIES_CONFIG.symmetricAlgorithm, config_js_1.ECIES_CONFIG.symmetricNonceLength, key, plainText, AAD);
};
exports.symEncrypt = symEncrypt;
var symDecrypt = function (key, cipherText, AAD) {
    return _exec(_decrypt, config_js_1.ECIES_CONFIG.symmetricAlgorithm, config_js_1.ECIES_CONFIG.symmetricNonceLength, key, cipherText, AAD);
};
exports.symDecrypt = symDecrypt;
/** @deprecated - use `symEncrypt` instead. */
exports.aesEncrypt = exports.symEncrypt; // TODO: delete
/** @deprecated - use `symDecrypt` instead. */
exports.aesDecrypt = exports.symDecrypt; // TODO: delete
function _exec(callback, algorithm, nonceLength, // aes-256-gcm only
key, data, AAD) {
    if (algorithm === "aes-256-gcm") {
        return callback(aes_1.aes256gcm, key, data, nonceLength, consts_js_1.AEAD_TAG_LENGTH, AAD);
    }
    else if (algorithm === "xchacha20") {
        return callback(chacha_1.xchacha20, key, data, consts_js_1.XCHACHA20_NONCE_LENGTH, consts_js_1.AEAD_TAG_LENGTH, AAD);
    }
    else if (algorithm === "aes-256-cbc") {
        // NOT RECOMMENDED. There is neither AAD nor AEAD tag in cbc mode
        // aes-256-cbc always uses 16 bytes iv
        return callback(aes_1.aes256cbc, key, data, 16, 0);
    }
    else {
        throw new Error("Not implemented");
    }
}
function _encrypt(func, key, data, nonceLength, tagLength, AAD) {
    var nonce = (0, webcrypto_1.randomBytes)(nonceLength);
    var cipher = func(key, nonce, AAD);
    // @noble/ciphers format: cipherText || tag
    var encrypted = cipher.encrypt(data);
    if (tagLength === 0) {
        return (0, utils_1.concatBytes)(nonce, encrypted);
    }
    var cipherTextLength = encrypted.length - tagLength;
    var cipherText = encrypted.subarray(0, cipherTextLength);
    var tag = encrypted.subarray(cipherTextLength);
    // ecies payload format: pk || nonce || tag || cipherText
    return (0, utils_1.concatBytes)(nonce, tag, cipherText);
}
function _decrypt(func, key, data, nonceLength, tagLength, AAD) {
    var nonce = data.subarray(0, nonceLength);
    var cipher = func(key, Uint8Array.from(nonce), AAD); // to reset byteOffset
    var encrypted = data.subarray(nonceLength);
    if (tagLength === 0) {
        return cipher.decrypt(encrypted);
    }
    var tag = encrypted.subarray(0, tagLength);
    var cipherText = encrypted.subarray(tagLength);
    return cipher.decrypt((0, utils_1.concatBytes)(cipherText, tag));
}
