export interface JwkCertificate {
    kty: string;
    alg: string;
    use?: string;
    kid: string;
    n: string;
    e: string;
}
export interface CryptoSigner {
    update(data: string): void;
    sign(key: string, outputFormat: string): string;
}
export interface Crypto {
    sha256DigestBase64(str: string): Promise<string>;
    randomBytesBase64(n: number): string;
    verify(pubkey: string | JwkCertificate, data: string | Buffer, signature: string): Promise<boolean>;
    sign(privateKey: string | JwkCertificate, data: string | Buffer): Promise<string>;
    decodeBase64StringUtf8(base64: string): string;
    encodeBase64StringUtf8(text: string): string;
    /**
     * Computes the SHA-256 hash of the provided string.
     * @param str The plain text string to hash.
     * @return A promise that resolves with the SHA-256 hash of the provided
     *   string in hexadecimal encoding.
     */
    sha256DigestHex(str: string): Promise<string>;
    /**
     * Computes the HMAC hash of a message using the provided crypto key and the
     * SHA-256 algorithm.
     * @param key The secret crypto key in utf-8 or ArrayBuffer format.
     * @param msg The plain text message.
     * @return A promise that resolves with the HMAC-SHA256 hash in ArrayBuffer
     *   format.
     */
    signWithHmacSha256(key: string | ArrayBuffer, msg: string): Promise<ArrayBuffer>;
}
export declare function createCrypto(): Crypto;
export declare function hasBrowserCrypto(): boolean;
/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param arrayBuffer The ArrayBuffer to convert to hexadecimal string.
 * @return The hexadecimal encoding of the ArrayBuffer.
 */
export declare function fromArrayBufferToHex(arrayBuffer: ArrayBuffer): string;
