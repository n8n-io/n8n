import { ICrypto, IPerformanceClient, Logger, ShrOptions, SignedHttpRequest, SignedHttpRequestParameters } from "@azure/msal-common/browser";
export type CachedKeyPair = {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
    requestMethod?: string;
    requestUri?: string;
};
/**
 * This class implements MSAL's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and
 * implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
 */
export declare class CryptoOps implements ICrypto {
    private logger;
    /**
     * CryptoOps can be used in contexts outside a PCA instance,
     * meaning there won't be a performance manager available.
     */
    private performanceClient;
    private static POP_KEY_USAGES;
    private static EXTRACTABLE;
    private cache;
    constructor(logger: Logger, performanceClient?: IPerformanceClient, skipValidateSubtleCrypto?: boolean);
    /**
     * Creates a new random GUID - used to populate state and nonce.
     * @returns string (GUID)
     */
    createNewGuid(): string;
    /**
     * Encodes input string to base64.
     * @param input
     */
    base64Encode(input: string): string;
    /**
     * Decodes input string from base64.
     * @param input
     */
    base64Decode(input: string): string;
    /**
     * Encodes input string to base64 URL safe string.
     * @param input
     */
    base64UrlEncode(input: string): string;
    /**
     * Stringifies and base64Url encodes input public key
     * @param inputKid
     * @returns Base64Url encoded public key
     */
    encodeKid(inputKid: string): string;
    /**
     * Generates a keypair, stores it and returns a thumbprint
     * @param request
     */
    getPublicKeyThumbprint(request: SignedHttpRequestParameters): Promise<string>;
    /**
     * Removes cryptographic keypair from key store matching the keyId passed in
     * @param kid
     */
    removeTokenBindingKey(kid: string): Promise<void>;
    /**
     * Removes all cryptographic keys from IndexedDB storage
     */
    clearKeystore(): Promise<boolean>;
    /**
     * Signs the given object as a jwt payload with private key retrieved by given kid.
     * @param payload
     * @param kid
     */
    signJwt(payload: SignedHttpRequest, kid: string, shrOptions?: ShrOptions, correlationId?: string): Promise<string>;
    /**
     * Returns the SHA-256 hash of an input string
     * @param plainText
     */
    hashString(plainText: string): Promise<string>;
}
//# sourceMappingURL=CryptoOps.d.ts.map