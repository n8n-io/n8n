// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LocalCryptographyUnsupportedError } from "./models";
/**
 * The browser replacement of the AesCryptographyProvider. Since we do not
 * support local cryptography in the browser this replacement always returns false
 * for `supportsAlgorithm` and `supportsOperation` so that these methods should
 * never be called.
 */
export class AesCryptographyProvider {
    encrypt() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
    decrypt() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
    /**
     * Browser RSA provider does not support any algorithms or operations.
     */
    isSupported() {
        return false;
    }
    wrapKey() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
    unwrapKey() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
    sign() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
    signData() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
    verify() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
    verifyData() {
        throw new LocalCryptographyUnsupportedError("AES Local cryptography is not supported in the browser.");
    }
}
//# sourceMappingURL=aesCryptographyProvider.browser.js.map