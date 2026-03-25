import { IPerformanceClient } from "@azure/msal-common/browser";
/**
 * Check whether browser crypto is available.
 */
export declare function validateCryptoAvailable(skipValidateSubtleCrypto: boolean): void;
/**
 * Returns a sha-256 hash of the given dataString as an ArrayBuffer.
 * @param dataString {string} data string
 * @param performanceClient {?IPerformanceClient}
 * @param correlationId {?string} correlation id
 */
export declare function sha256Digest(dataString: string, performanceClient?: IPerformanceClient, correlationId?: string): Promise<ArrayBuffer>;
/**
 * Populates buffer with cryptographically random values.
 * @param dataBuffer
 */
export declare function getRandomValues(dataBuffer: Uint8Array): Uint8Array;
/**
 * Creates a UUID v7 from the current timestamp.
 * Implementation relies on the system clock to guarantee increasing order of generated identifiers.
 * @returns {number}
 */
export declare function createNewGuid(): string;
/**
 * Generates a keypair based on current keygen algorithm config.
 * @param extractable
 * @param usages
 */
export declare function generateKeyPair(extractable: boolean, usages: Array<KeyUsage>): Promise<CryptoKeyPair>;
/**
 * Export key as Json Web Key (JWK)
 * @param key
 */
export declare function exportJwk(key: CryptoKey): Promise<JsonWebKey>;
/**
 * Imports key as Json Web Key (JWK), can set extractable and usages.
 * @param key
 * @param extractable
 * @param usages
 */
export declare function importJwk(key: JsonWebKey, extractable: boolean, usages: Array<KeyUsage>): Promise<CryptoKey>;
/**
 * Signs given data with given key
 * @param key
 * @param data
 */
export declare function sign(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer>;
/**
 * Generates Base64 encoded jwk used in the Encrypted Authorize Response (EAR) flow
 */
export declare function generateEarKey(): Promise<string>;
/**
 * Parses earJwk for encryption key and returns CryptoKey object
 * @param earJwk
 * @returns
 */
export declare function importEarKey(earJwk: string): Promise<CryptoKey>;
/**
 * Decrypt ear_jwe response returned in the Encrypted Authorize Response (EAR) flow
 * @param earJwk
 * @param earJwe
 * @returns
 */
export declare function decryptEarResponse(earJwk: string, earJwe: string): Promise<string>;
/**
 * Generates symmetric base encryption key. This may be stored as all encryption/decryption keys will be derived from this one.
 */
export declare function generateBaseKey(): Promise<ArrayBuffer>;
/**
 * Returns the raw key to be passed into the key derivation function
 * @param baseKey
 * @returns
 */
export declare function generateHKDF(baseKey: ArrayBuffer): Promise<CryptoKey>;
/**
 * Encrypt the given data given a base key. Returns encrypted data and a nonce that must be provided during decryption
 * @param key
 * @param rawData
 */
export declare function encrypt(baseKey: CryptoKey, rawData: string, context: string): Promise<{
    data: string;
    nonce: string;
}>;
/**
 * Decrypt data with the given key and nonce
 * @param key
 * @param nonce
 * @param encryptedData
 * @returns
 */
export declare function decrypt(baseKey: CryptoKey, nonce: string, context: string, encryptedData: string): Promise<string>;
/**
 * Returns the SHA-256 hash of an input string
 * @param plainText
 */
export declare function hashString(plainText: string): Promise<string>;
//# sourceMappingURL=BrowserCrypto.d.ts.map