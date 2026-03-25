"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aes256cbc = exports.aes256gcm = void 0;
var aes_1 = require("@noble/ciphers/aes");
var aes256gcm = function (key, nonce, AAD) {
    return (0, aes_1.gcm)(key, nonce, AAD);
};
exports.aes256gcm = aes256gcm;
var aes256cbc = function (key, nonce, _AAD) {
    return (0, aes_1.cbc)(key, nonce);
};
exports.aes256cbc = aes256cbc;
