"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unwrap = exports.wrap = void 0;
const encrypt_js_1 = require("../runtime/encrypt.js");
const decrypt_js_1 = require("../runtime/decrypt.js");
const iv_js_1 = require("./iv.js");
const base64url_js_1 = require("../runtime/base64url.js");
async function wrap(alg, key, cek, iv) {
    const jweAlgorithm = alg.slice(0, 7);
    iv || (iv = (0, iv_js_1.default)(jweAlgorithm));
    const { ciphertext: encryptedKey, tag } = await (0, encrypt_js_1.default)(jweAlgorithm, cek, key, iv, new Uint8Array(0));
    return { encryptedKey, iv: (0, base64url_js_1.encode)(iv), tag: (0, base64url_js_1.encode)(tag) };
}
exports.wrap = wrap;
async function unwrap(alg, key, encryptedKey, iv, tag) {
    const jweAlgorithm = alg.slice(0, 7);
    return (0, decrypt_js_1.default)(jweAlgorithm, key, encryptedKey, iv, tag, new Uint8Array(0));
}
exports.unwrap = unwrap;
