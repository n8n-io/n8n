"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHash = createHash;
exports.createVerify = createVerify;
exports.randomBytes = randomBytes;
const node_crypto_1 = require("node:crypto");
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
async function createHash(algorithm, data) {
    const hashAlgorithm = algorithmToHashAlgorithm[algorithm];
    if (!hashAlgorithm) {
        throw new Error(`Invalid algorithm ${algorithm} passed to createHash. Supported algorithms: ${Object.keys(algorithmToHashAlgorithm).join(", ")}`);
    }
    const hash = (0, node_crypto_1.createHash)(hashAlgorithm);
    hash.update(Buffer.from(data));
    const digest = hash.digest();
    return digest;
}
/**
 * @internal
 * Use the platform-local verify functionality
 */
function createVerify(algorithm, data) {
    const verifyAlgorithm = algorithmToHashAlgorithm[algorithm];
    if (!verifyAlgorithm) {
        throw new Error(`Invalid algorithm ${algorithm} passed to createHash. Supported algorithms: ${Object.keys(algorithmToHashAlgorithm).join(", ")}`);
    }
    const verifier = (0, node_crypto_1.createVerify)(verifyAlgorithm);
    verifier.update(Buffer.from(data));
    verifier.end();
    return verifier;
}
/**
 * @internal
 * Use the platform-local randomBytes functionality
 */
function randomBytes(length) {
    return (0, node_crypto_1.randomBytes)(length);
}
//# sourceMappingURL=crypto.js.map