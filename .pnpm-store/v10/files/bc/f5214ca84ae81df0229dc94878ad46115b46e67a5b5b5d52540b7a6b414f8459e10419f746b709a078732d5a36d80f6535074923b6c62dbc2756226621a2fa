// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createHash as cryptoCreateHash, createVerify as cryptoCreateVerify, randomBytes as cryptoRandomBytes, } from "node:crypto";
/**
 * @internal
 * Mapping between signature algorithms and their corresponding hash algorithms. Externally used for testing.
 **/
const algorithmToHashAlgorithm = {
    ES256: "SHA256",
    ES256K: "SHA256",
    PS256: "SHA256",
    RS256: "SHA256",
    ES384: "SHA384",
    PS384: "SHA384",
    RS384: "SHA384",
    ES512: "SHA512",
    PS512: "SHA512",
    RS512: "SHA512",
};
/**
 * @internal
 * Use the platform-local hashing functionality
 */
export async function createHash(algorithm, data) {
    const hashAlgorithm = algorithmToHashAlgorithm[algorithm];
    if (!hashAlgorithm) {
        throw new Error(`Invalid algorithm ${algorithm} passed to createHash. Supported algorithms: ${Object.keys(algorithmToHashAlgorithm).join(", ")}`);
    }
    const hash = cryptoCreateHash(hashAlgorithm);
    hash.update(Buffer.from(data));
    const digest = hash.digest();
    return digest;
}
/**
 * @internal
 * Use the platform-local verify functionality
 */
export function createVerify(algorithm, data) {
    const verifyAlgorithm = algorithmToHashAlgorithm[algorithm];
    if (!verifyAlgorithm) {
        throw new Error(`Invalid algorithm ${algorithm} passed to createHash. Supported algorithms: ${Object.keys(algorithmToHashAlgorithm).join(", ")}`);
    }
    const verifier = cryptoCreateVerify(verifyAlgorithm);
    verifier.update(Buffer.from(data));
    verifier.end();
    return verifier;
}
/**
 * @internal
 * Use the platform-local randomBytes functionality
 */
export function randomBytes(length) {
    return cryptoRandomBytes(length);
}
//# sourceMappingURL=crypto.js.map