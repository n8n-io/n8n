"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSha256Hmac = computeSha256Hmac;
exports.computeSha256Hash = computeSha256Hash;
const bytesEncoding_js_1 = require("./bytesEncoding.js");
let subtleCrypto;
/**
 * Returns a cached reference to the Web API crypto.subtle object.
 * @internal
 */
function getCrypto() {
    if (subtleCrypto) {
        return subtleCrypto;
    }
    if (!self.crypto || !self.crypto.subtle) {
        throw new Error("Your browser environment does not support cryptography functions.");
    }
    subtleCrypto = self.crypto.subtle;
    return subtleCrypto;
}
/**
 * Generates a SHA-256 HMAC signature.
 * @param key - The HMAC key represented as a base64 string, used to generate the cryptographic HMAC hash.
 * @param stringToSign - The data to be signed.
 * @param encoding - The textual encoding to use for the returned HMAC digest.
 */
async function computeSha256Hmac(key, stringToSign, encoding) {
    const crypto = getCrypto();
    const keyBytes = (0, bytesEncoding_js_1.stringToUint8Array)(key, "base64");
    const stringToSignBytes = (0, bytesEncoding_js_1.stringToUint8Array)(stringToSign, "utf-8");
    const cryptoKey = await crypto.importKey("raw", keyBytes, {
        name: "HMAC",
        hash: { name: "SHA-256" },
    }, false, ["sign"]);
    const signature = await crypto.sign({
        name: "HMAC",
        hash: { name: "SHA-256" },
    }, cryptoKey, stringToSignBytes);
    return (0, bytesEncoding_js_1.uint8ArrayToString)(new Uint8Array(signature), encoding);
}
/**
 * Generates a SHA-256 hash.
 * @param content - The data to be included in the hash.
 * @param encoding - The textual encoding to use for the returned hash.
 */
async function computeSha256Hash(content, encoding) {
    const contentBytes = (0, bytesEncoding_js_1.stringToUint8Array)(content, "utf-8");
    const digest = await getCrypto().digest({ name: "SHA-256" }, contentBytes);
    return (0, bytesEncoding_js_1.uint8ArrayToString)(new Uint8Array(digest), encoding);
}
//# sourceMappingURL=sha256.common.js.map