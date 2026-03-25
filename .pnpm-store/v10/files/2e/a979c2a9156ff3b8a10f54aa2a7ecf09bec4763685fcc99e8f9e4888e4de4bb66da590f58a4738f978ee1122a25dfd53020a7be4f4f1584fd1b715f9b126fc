// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LocalCryptographyUnsupportedError } from "./models";
/**
 * The browser replacement of the RsaCryptographyProvider. Since we do not
 * support local cryptography in the browser this replacement always returns false
 * for `supportsAlgorithm` and `supportsOperation` so that these methods should
 * never be called.
 */
export class RsaCryptographyProvider {
    encrypt() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
    decrypt() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
    /**
     * Browser RSA Provider does not support any algorithms or operations.
     */
    isSupported() {
        return false;
    }
    wrapKey() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
    unwrapKey() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
    sign() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
    signData() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
    verify() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
    verifyData() {
        throw new LocalCryptographyUnsupportedError("RSA Local cryptography is not supported in the browser.");
    }
}
//# sourceMappingURL=rsaCryptographyProvider.browser.js.map