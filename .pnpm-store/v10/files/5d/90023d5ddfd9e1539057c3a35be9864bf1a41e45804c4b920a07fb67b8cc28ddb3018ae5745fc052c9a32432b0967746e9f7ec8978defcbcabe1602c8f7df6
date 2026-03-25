"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chacha20 = exports.xchacha20 = void 0;
var utils_1 = require("@noble/ciphers/utils");
var compat_js_1 = require("../_node/compat.js");
var hchacha_js_1 = require("../_node/hchacha.js");
var xchacha20 = function (key, nonce, AAD) {
    if (nonce.length !== 24) {
        throw new Error("xchacha20's nonce must be 24 bytes");
    }
    var constants = new Uint32Array([0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]); // "expand 32-byte k"
    var subKey = new Uint32Array(8);
    (0, hchacha_js_1._hchacha20)(constants, (0, utils_1.u32)(key), (0, utils_1.u32)(nonce.subarray(0, 16)), subKey);
    var subNonce = new Uint8Array(12);
    subNonce.set([0, 0, 0, 0]);
    subNonce.set(nonce.subarray(16), 4);
    return (0, compat_js_1._compat)("chacha20-poly1305", (0, utils_1.u8)(subKey), subNonce, AAD);
};
exports.xchacha20 = xchacha20;
var chacha20 = function (key, nonce, AAD) {
    if (nonce.length !== 12) {
        throw new Error("chacha20's nonce must be 12 bytes");
    }
    return (0, compat_js_1._compat)("chacha20-poly1305", key, nonce, AAD);
};
exports.chacha20 = chacha20;
