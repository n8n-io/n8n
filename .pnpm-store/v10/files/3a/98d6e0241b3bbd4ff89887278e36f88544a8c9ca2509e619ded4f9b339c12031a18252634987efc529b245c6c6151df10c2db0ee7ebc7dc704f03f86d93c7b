import type { CryptographyProvider } from "./models.js";
/**
 * The browser replacement of the AesCryptographyProvider. Since we do not
 * support local cryptography in the browser this replacement always returns false
 * for `supportsAlgorithm` and `supportsOperation` so that these methods should
 * never be called.
 */
export declare class AesCryptographyProvider implements CryptographyProvider {
    encrypt(): never;
    decrypt(): never;
    /**
     * Browser RSA provider does not support any algorithms or operations.
     */
    isSupported(): boolean;
    wrapKey(): never;
    unwrapKey(): never;
    sign(): never;
    signData(): never;
    verify(): never;
    verifyData(): never;
}
//# sourceMappingURL=aesCryptographyProvider-browser.d.mts.map