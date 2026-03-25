/**
 * Encrypts data with a receiver's public key.
 * @description
 * In version 0.4.18, `Buffer` is returned when available, otherwise `Uint8Array`.
 * From version 0.5.0, this function will always return `Uint8Array`.
 * To preserve the pre-0.5.0 behavior of returning a `Buffer`, wrap the result with `Buffer.from(encrypt(...))`.
 *
 * @param receiverRawPK - Raw public key of the receiver, either as a hex `string` or a `Uint8Array`.
 * @param data - Data to encrypt.
 * @returns Encrypted payload, format: `public key || encrypted`.
 */
export declare function encrypt(receiverRawPK: string | Uint8Array, data: Uint8Array): Uint8Array;
/**
 * Decrypts data with a receiver's private key.
 * @description
 * In version 0.4.18, `Buffer` is returned when available, otherwise `Uint8Array`.
 * From version 0.5.0, this function will always return `Uint8Array`.
 * To preserve the pre-0.5.0 behavior of returning a `Buffer`, wrap the result with `Buffer.from(decrypt(...))`.
 *
 * @param receiverRawSK - Raw private key of the receiver, either as a hex `string` or a `Uint8Array`.
 * @param data - Data to decrypt.
 * @returns Decrypted plain text.
 */
export declare function decrypt(receiverRawSK: string | Uint8Array, data: Uint8Array): Uint8Array;
export { ECIES_CONFIG } from "./config.js";
export { PrivateKey, PublicKey } from "./keys/index.js";
/** @deprecated - use `import * as utils from "eciesjs/utils"` instead. */
export declare const utils: {
    aesEncrypt: (key: Uint8Array, plainText: Uint8Array, AAD?: Uint8Array) => Uint8Array;
    aesDecrypt: (key: Uint8Array, cipherText: Uint8Array, AAD?: Uint8Array) => Uint8Array;
    symEncrypt: (key: Uint8Array, plainText: Uint8Array, AAD?: Uint8Array) => Uint8Array;
    symDecrypt: (key: Uint8Array, cipherText: Uint8Array, AAD?: Uint8Array) => Uint8Array;
    decodeHex: (hex: string) => Uint8Array;
    getValidSecret: (curve?: import("./config.js").EllipticCurve) => Uint8Array;
    remove0x: (hex: string) => string;
};
