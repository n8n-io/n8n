import type { CryptographyProvider } from "./models.js";
/**
 * The browser replacement of the RsaCryptographyProvider. Since we do not
 * support local cryptography in the browser this replacement always returns false
 * for `supportsAlgorithm` and `supportsOperation` so that these methods should
 * never be called.
 */
export declare class RsaCryptographyProvider implements CryptographyProvider {
    encrypt(): never;
    decrypt(): never;
    /**
     * Browser RSA Provider does not support any algorithms or operations.
     */
    isSupported(): boolean;
    wrapKey(): never;
    unwrapKey(): never;
    sign(): never;
    signData(): never;
    verify(): never;
    verifyData(): never;
}
//# sourceMappingURL=rsaCryptographyProvider-browser.d.mts.map