"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsaCryptographyProvider = void 0;
const constants_1 = require("constants");
const node_crypto_1 = require("node:crypto");
const crypto_js_1 = require("./crypto.js");
const conversions_js_1 = require("./conversions.js");
const models_js_1 = require("./models.js");
/**
 * An RSA cryptography provider supporting RSA algorithms.
 */
class RsaCryptographyProvider {
    constructor(key) {
        /**
         * The set of algorithms this provider supports
         */
        this.applicableAlgorithms = [
            "RSA1_5",
            "RSA-OAEP",
            "PS256",
            "RS256",
            "PS384",
            "RS384",
            "PS512",
            "RS512",
        ];
        /**
         * The set of operations this provider supports
         */
        this.applicableOperations = [
            "encrypt",
            "wrapKey",
            "verifyData",
        ];
        /**
         * Mapping between signature algorithms and their corresponding hash algorithms. Externally used for testing.
         * @internal
         */
        this.signatureAlgorithmToHashAlgorithm = {
            PS256: "SHA256",
            RS256: "SHA256",
            PS384: "SHA384",
            RS384: "SHA384",
            PS512: "SHA512",
            RS512: "SHA512",
        };
        this.key = key;
    }
    isSupported(algorithm, operation) {
        return (this.applicableAlgorithms.includes(algorithm) && this.applicableOperations.includes(operation));
    }
    encrypt(encryptParameters, _options) {
        this.ensureValid();
        const keyPEM = (0, conversions_js_1.convertJWKtoPEM)(this.key);
        const padding = encryptParameters.algorithm === "RSA1_5" ? constants_1.RSA_PKCS1_PADDING : constants_1.RSA_PKCS1_OAEP_PADDING;
        return Promise.resolve({
            algorithm: encryptParameters.algorithm,
            keyID: this.key.kid,
            result: (0, node_crypto_1.publicEncrypt)({ key: keyPEM, padding: padding }, Buffer.from(encryptParameters.plaintext)),
        });
    }
    decrypt(_decryptParameters, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Decrypting using a local JsonWebKey is not supported.");
    }
    wrapKey(algorithm, keyToWrap, _options) {
        this.ensureValid();
        const keyPEM = (0, conversions_js_1.convertJWKtoPEM)(this.key);
        const padding = algorithm === "RSA1_5" ? constants_1.RSA_PKCS1_PADDING : constants_1.RSA_PKCS1_OAEP_PADDING;
        return Promise.resolve({
            algorithm: algorithm,
            result: (0, node_crypto_1.publicEncrypt)({ key: keyPEM, padding }, Buffer.from(keyToWrap)),
            keyID: this.key.kid,
        });
    }
    unwrapKey(_algorithm, _encryptedKey, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Unwrapping a key using a local JsonWebKey is not supported.");
    }
    sign(_algorithm, _digest, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Signing a digest using a local JsonWebKey is not supported.");
    }
    signData(_algorithm, _data, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Signing a block of data using a local JsonWebKey is not supported.");
    }
    async verify(_algorithm, _digest, _signature, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Verifying a digest using a local JsonWebKey is not supported.");
    }
    verifyData(algorithm, data, signature, _options) {
        this.ensureValid();
        const keyPEM = (0, conversions_js_1.convertJWKtoPEM)(this.key);
        const verifier = (0, crypto_js_1.createVerify)(algorithm, data);
        return Promise.resolve({
            result: verifier.verify(keyPEM, Buffer.from(signature)),
            keyID: this.key.kid,
        });
    }
    ensureValid() {
        var _a, _b;
        if (this.key &&
            ((_a = this.key.kty) === null || _a === void 0 ? void 0 : _a.toUpperCase()) !== "RSA" &&
            ((_b = this.key.kty) === null || _b === void 0 ? void 0 : _b.toUpperCase()) !== "RSA-HSM") {
            throw new Error("Key type does not match the algorithm RSA");
        }
    }
}
exports.RsaCryptographyProvider = RsaCryptographyProvider;
//# sourceMappingURL=rsaCryptographyProvider.js.map