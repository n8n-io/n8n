"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AesCryptographyProvider = void 0;
const tslib_1 = require("tslib");
const crypto = tslib_1.__importStar(require("node:crypto"));
const models_js_1 = require("./models.js");
/**
 * An AES cryptography provider supporting AES algorithms.
 * @internal
 */
class AesCryptographyProvider {
    constructor(key) {
        /**
         * The set of algorithms this provider supports.
         * For AES encryption, the values include the underlying algorithm used in crypto
         * as well as the key size in bytes.
         *
         * We start with support for A[SIZE]CBCPAD which uses the PKCS padding (the default padding scheme in node crypto)
         */
        this.supportedAlgorithms = {
            A128CBCPAD: {
                algorithm: "aes-128-cbc",
                keySizeInBytes: 128 >> 3,
            },
            A192CBCPAD: {
                algorithm: "aes-192-cbc",
                keySizeInBytes: 192 >> 3,
            },
            A256CBCPAD: {
                algorithm: "aes-256-cbc",
                keySizeInBytes: 256 >> 3,
            },
        };
        this.supportedOperations = ["encrypt", "decrypt"];
        this.key = key;
    }
    encrypt(encryptParameters, _options) {
        const { algorithm, keySizeInBytes } = this.supportedAlgorithms[encryptParameters.algorithm];
        const iv = encryptParameters.iv || crypto.randomBytes(16);
        this.ensureValid(keySizeInBytes);
        const cipher = crypto.createCipheriv(algorithm, this.key.k.subarray(0, keySizeInBytes), iv);
        let encrypted = cipher.update(Buffer.from(encryptParameters.plaintext));
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return Promise.resolve({
            algorithm: encryptParameters.algorithm,
            result: encrypted,
            iv: iv,
        });
    }
    decrypt(decryptParameters, _options) {
        const { algorithm, keySizeInBytes } = this.supportedAlgorithms[decryptParameters.algorithm];
        this.ensureValid(keySizeInBytes);
        const decipher = crypto.createDecipheriv(algorithm, this.key.k.subarray(0, keySizeInBytes), decryptParameters.iv);
        let dec = decipher.update(Buffer.from(decryptParameters.ciphertext));
        dec = Buffer.concat([dec, decipher.final()]);
        return Promise.resolve({
            algorithm: decryptParameters.algorithm,
            result: dec,
        });
    }
    isSupported(algorithm, operation) {
        if (!this.key.k) {
            return false;
        }
        if (!Object.keys(this.supportedAlgorithms).includes(algorithm)) {
            return false;
        }
        if (!this.supportedOperations.includes(operation)) {
            return false;
        }
        return true;
    }
    wrapKey(_algorithm, _keyToWrap, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Wrapping a key using a local JsonWebKey is not supported for AES.");
    }
    unwrapKey(_algorithm, _encryptedKey, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Unwrapping a key using a local JsonWebKey is not supported for AES.");
    }
    sign(_algorithm, _digest, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Signing using a local JsonWebKey is not supported for AES.");
    }
    signData(_algorithm, _data, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Signing using a local JsonWebKey is not supported for AES.");
    }
    verify(_algorithm, _digest, _signature, _options) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Verifying using a local JsonWebKey is not supported for AES.");
    }
    verifyData(_algorithm, _data, _signature, _updatedOptions) {
        throw new models_js_1.LocalCryptographyUnsupportedError("Verifying using a local JsonWebKey is not supported for AES.");
    }
    ensureValid(keySizeInBytes) {
        var _a, _b;
        if (this.key &&
            ((_a = this.key.kty) === null || _a === void 0 ? void 0 : _a.toUpperCase()) !== "OCT" &&
            ((_b = this.key.kty) === null || _b === void 0 ? void 0 : _b.toUpperCase()) !== "OCT-HSM") {
            throw new Error("Key type does not match the key type oct or oct-hsm");
        }
        if (!this.key.k) {
            throw new Error("Symmetric key is required");
        }
        if (this.key.k.length < keySizeInBytes) {
            throw new Error(`Key must be at least ${keySizeInBytes << 3} bits`);
        }
    }
}
exports.AesCryptographyProvider = AesCryptographyProvider;
//# sourceMappingURL=aesCryptographyProvider.js.map