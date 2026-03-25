import { type Cipher, type CipherWithOutput } from './utils.ts';
/** Key expansion used in CTR. */
declare function expandKeyLE(key: Uint8Array): Uint32Array;
declare function expandKeyDecLE(key: Uint8Array): Uint32Array;
declare function encrypt(xk: Uint32Array, s0: number, s1: number, s2: number, s3: number): {
    s0: number;
    s1: number;
    s2: number;
    s3: number;
};
declare function decrypt(xk: Uint32Array, s0: number, s1: number, s2: number, s3: number): {
    s0: number;
    s1: number;
    s2: number;
    s3: number;
};
declare function ctrCounter(xk: Uint32Array, nonce: Uint8Array, src: Uint8Array, dst?: Uint8Array): Uint8Array;
declare function ctr32(xk: Uint32Array, isLE: boolean, nonce: Uint8Array, src: Uint8Array, dst?: Uint8Array): Uint8Array;
/**
 * CTR: counter mode. Creates stream cipher.
 * Requires good IV. Parallelizable. OK, but no MAC.
 */
export declare const ctr: ((key: Uint8Array, nonce: Uint8Array) => CipherWithOutput) & {
    blockSize: number;
    nonceLength: number;
};
/** Options for ECB and CBC. */
export type BlockOpts = {
    disablePadding?: boolean;
};
/**
 * ECB: Electronic CodeBook. Simple deterministic replacement.
 * Dangerous: always map x to y. See [AES Penguin](https://words.filippo.io/the-ecb-penguin/).
 */
export declare const ecb: ((key: Uint8Array, opts?: BlockOpts) => CipherWithOutput) & {
    blockSize: number;
};
/**
 * CBC: Cipher-Block-Chaining. Key is previous round’s block.
 * Fragile: needs proper padding. Unauthenticated: needs MAC.
 */
export declare const cbc: ((key: Uint8Array, iv: Uint8Array, opts?: BlockOpts) => CipherWithOutput) & {
    blockSize: number;
    nonceLength: number;
};
/**
 * CFB: Cipher Feedback Mode. The input for the block cipher is the previous cipher output.
 * Unauthenticated: needs MAC.
 */
export declare const cfb: ((key: Uint8Array, iv: Uint8Array) => CipherWithOutput) & {
    blockSize: number;
    nonceLength: number;
};
/**
 * GCM: Galois/Counter Mode.
 * Modern, parallel version of CTR, with MAC.
 * Be careful: MACs can be forged.
 * Unsafe to use random nonces under the same key, due to collision chance.
 * As for nonce size, prefer 12-byte, instead of 8-byte.
 */
export declare const gcm: ((key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher) & {
    blockSize: number;
    nonceLength: number;
    tagLength: number;
    varSizeNonce: true;
};
/**
 * AES-GCM-SIV: classic AES-GCM with nonce-misuse resistance.
 * Guarantees that, when a nonce is repeated, the only security loss is that identical
 * plaintexts will produce identical ciphertexts.
 * RFC 8452, https://datatracker.ietf.org/doc/html/rfc8452
 */
export declare const gcmsiv: ((key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher) & {
    blockSize: number;
    nonceLength: number;
    tagLength: number;
    varSizeNonce: true;
};
/**
 * AES-GCM-SIV, not AES-SIV.
 * This is legace name, use `gcmsiv` export instead.
 * @deprecated
 */
export declare const siv: typeof gcmsiv;
declare function encryptBlock(xk: Uint32Array, block: Uint8Array): Uint8Array;
declare function decryptBlock(xk: Uint32Array, block: Uint8Array): Uint8Array;
/**
 * AES-KW (key-wrap). Injects static IV into plaintext, adds counter, encrypts 6 times.
 * Reduces block size from 16 to 8 bytes.
 * For padded version, use aeskwp.
 * [RFC 3394](https://datatracker.ietf.org/doc/rfc3394/),
 * [NIST.SP.800-38F](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38F.pdf).
 */
export declare const aeskw: ((kek: Uint8Array) => Cipher) & {
    blockSize: number;
};
/**
 * AES-KW, but with padding and allows random keys.
 * Second u32 of IV is used as counter for length.
 * [RFC 5649](https://www.rfc-editor.org/rfc/rfc5649)
 */
export declare const aeskwp: ((kek: Uint8Array) => Cipher) & {
    blockSize: number;
};
/** Unsafe low-level internal methods. May change at any time. */
export declare const unsafe: {
    expandKeyLE: typeof expandKeyLE;
    expandKeyDecLE: typeof expandKeyDecLE;
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    encryptBlock: typeof encryptBlock;
    decryptBlock: typeof decryptBlock;
    ctrCounter: typeof ctrCounter;
    ctr32: typeof ctr32;
};
export {};
//# sourceMappingURL=aes.d.ts.map