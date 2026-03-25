import { type Cipher, type XorStream } from './utils.ts';
export type ARXCipherN = ((key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher) & {
    blockSize: number;
    nonceLength: number;
    tagLength: number;
};
/** hsalsa hashes key and nonce into key' and nonce'. */
export declare function hsalsa(s: Uint32Array, k: Uint32Array, i: Uint32Array, o32: Uint32Array): void;
/** hchacha hashes key and nonce into key' and nonce'. */
export declare function hchacha(s: Uint32Array, k: Uint32Array, i: Uint32Array, o32: Uint32Array): void;
/** salsa20, 12-byte nonce. */
export declare const salsa20: XorStream;
/** xsalsa20, 24-byte nonce. */
export declare const xsalsa20: XorStream;
/** chacha20 non-RFC, original version by djb. 8-byte nonce, 8-byte counter. */
export declare const chacha20orig: XorStream;
/** chacha20 RFC 8439 (IETF / TLS). 12-byte nonce, 4-byte counter. */
export declare const chacha20: XorStream;
/** xchacha20 eXtended-nonce. https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha */
export declare const xchacha20: XorStream;
/** 8-round chacha from the original paper. */
export declare const chacha8: XorStream;
/** 12-round chacha from the original paper. */
export declare const chacha12: XorStream;
/** Poly1305 polynomial MAC. Can be speed-up using BigUint64Array, at the cost of complexity. */
export declare function poly1305(msg: Uint8Array, key: Uint8Array): Uint8Array;
/** xsalsa20-poly1305 eXtended-nonce (24 bytes) salsa. */
export declare const xsalsa20poly1305: ARXCipherN;
/** Alias to `xsalsa20poly1305`. */
export declare function secretbox(key: Uint8Array, nonce: Uint8Array): {
    seal: (plaintext: Uint8Array) => Uint8Array;
    open: (ciphertext: Uint8Array) => Uint8Array;
};
export declare const _poly1305_aead: (fn: XorStream) => (key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher;
/** chacha20-poly1305 12-byte-nonce chacha. */
export declare const chacha20poly1305: ARXCipherN;
/**
 * XChaCha20-Poly1305 extended-nonce chacha. Can be safely used with random nonces (CSPRNG).
 */
export declare const xchacha20poly1305: ARXCipherN;
//# sourceMappingURL=_micro.d.ts.map