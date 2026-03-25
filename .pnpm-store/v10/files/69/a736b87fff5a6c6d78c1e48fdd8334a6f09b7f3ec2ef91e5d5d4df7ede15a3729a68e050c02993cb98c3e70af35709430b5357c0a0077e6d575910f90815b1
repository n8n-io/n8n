// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { createHash, createHmac } from "crypto";
/**
 * Generates a SHA-256 HMAC signature.
 * @param key - The HMAC key represented as a base64 string, used to generate the cryptographic HMAC hash.
 * @param stringToSign - The data to be signed.
 * @param encoding - The textual encoding to use for the returned HMAC digest.
 */
export async function computeSha256Hmac(key, stringToSign, encoding) {
    const decodedKey = Buffer.from(key, "base64");
    return createHmac("sha256", decodedKey).update(stringToSign).digest(encoding);
}
/**
 * Generates a SHA-256 hash.
 * @param content - The data to be included in the hash.
 * @param encoding - The textual encoding to use for the returned hash.
 */
export async function computeSha256Hash(content, encoding) {
    return createHash("sha256").update(content).digest(encoding);
}
//# sourceMappingURL=sha256.js.map