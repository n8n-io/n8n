"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._compat = void 0;
// biome-ignore-all lint/suspicious/noExplicitAny: hide type error
var node_crypto_1 = require("node:crypto");
var utils_1 = require("@noble/ciphers/utils");
var AEAD_TAG_LENGTH = 16;
// @ts-expect-error: only necessary for deno
var IS_DENO = globalThis.Deno !== undefined;
/**
 * make `node:crypto`'s ciphers compatible with `@noble/ciphers`.
 *
 * `Cipher`'s interface is the same for both `aes-256-gcm` and `chacha20-poly1305`,
 * albeit the latter is one of `CipherCCMTypes`.
 * Interestingly, whether to set `plaintextLength` or not, or which value to set, has no actual effect.
 */
var _compat = function (algorithm, key, nonce, AAD) {
    var isAEAD = algorithm === "aes-256-gcm" || algorithm === "chacha20-poly1305";
    var authTagLength = isAEAD ? AEAD_TAG_LENGTH : 0;
    // authTagLength is necessary for `chacha20-poly1305` before Node v16.17
    var options = isAEAD ? { authTagLength: authTagLength } : undefined;
    var encrypt = function (plainText) {
        var cipher = (0, node_crypto_1.createCipheriv)(algorithm, key, nonce, options);
        if (isAEAD && AAD !== undefined) {
            cipher.setAAD(AAD);
        }
        var updated = cipher.update(plainText);
        var finalized = cipher.final();
        var tag = isAEAD ? cipher.getAuthTag() : new Uint8Array(0);
        return (0, utils_1.concatBytes)(updated, finalized, tag);
    };
    var decrypt = function (cipherText) {
        var rawCipherText = cipherText.subarray(0, cipherText.length - authTagLength);
        var tag = cipherText.subarray(cipherText.length - authTagLength);
        var decipher = (0, node_crypto_1.createDecipheriv)(algorithm, key, nonce, options);
        if (isAEAD) {
            if (AAD !== undefined) {
                decipher.setAAD(AAD);
            }
            decipher.setAuthTag(tag);
        }
        /* v8 ignore if -- @preserve */
        if (!isAEAD && IS_DENO) {
            decipher.setAutoPadding(false); // See: https://github.com/denoland/deno/issues/28381
        }
        var updated = decipher.update(rawCipherText);
        var finalized = decipher.final();
        return (0, utils_1.concatBytes)(updated, finalized);
    };
    return {
        encrypt: encrypt,
        decrypt: decrypt,
    };
};
exports._compat = _compat;
