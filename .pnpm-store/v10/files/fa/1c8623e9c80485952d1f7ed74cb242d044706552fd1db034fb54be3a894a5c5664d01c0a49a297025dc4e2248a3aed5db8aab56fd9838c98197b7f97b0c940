import { type ARXCipher, type XorStream } from './utils.ts';
/**
 * hsalsa hashing function, used primarily in xsalsa, to hash
 * key and nonce into key' and nonce'.
 * Same as salsaCore, but there doesn't seem to be a way to move the block
 * out without 25% performance hit.
 */
export declare function hsalsa(s: Uint32Array, k: Uint32Array, i: Uint32Array, o32: Uint32Array): void;
/**
 * Salsa20 from original paper.
 * Unsafe to use random nonces under the same key, due to collision chance.
 * Prefer XSalsa instead.
 */
export declare const salsa20: XorStream;
/**
 * xsalsa20 eXtended-nonce salsa.
 * Can be safely used with random 24-byte nonces (CSPRNG).
 */
export declare const xsalsa20: XorStream;
/**
 * xsalsa20-poly1305 eXtended-nonce salsa.
 * Can be safely used with random 24-byte nonces (CSPRNG).
 * Also known as secretbox from libsodium / nacl.
 */
export declare const xsalsa20poly1305: ARXCipher;
/**
 * Alias to `xsalsa20poly1305`, for compatibility with libsodium / nacl
 */
export declare function secretbox(key: Uint8Array, nonce: Uint8Array): {
    seal: (plaintext: Uint8Array, output?: Uint8Array) => Uint8Array;
    open: (ciphertext: Uint8Array, output?: Uint8Array) => Uint8Array;
};
//# sourceMappingURL=salsa.d.ts.map