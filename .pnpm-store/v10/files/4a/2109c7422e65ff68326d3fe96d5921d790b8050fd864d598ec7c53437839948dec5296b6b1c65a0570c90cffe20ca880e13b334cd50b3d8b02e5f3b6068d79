import { type ARXCipher, type CipherWithOutput, type XorStream } from './utils.ts';
/**
 * hchacha helper method, used primarily in xchacha, to hash
 * key and nonce into key' and nonce'.
 * Same as chachaCore, but there doesn't seem to be a way to move the block
 * out without 25% performance hit.
 */
export declare function hchacha(s: Uint32Array, k: Uint32Array, i: Uint32Array, o32: Uint32Array): void;
/**
 * Original, non-RFC chacha20 from DJB. 8-byte nonce, 8-byte counter.
 */
export declare const chacha20orig: XorStream;
/**
 * ChaCha stream cipher. Conforms to RFC 8439 (IETF, TLS). 12-byte nonce, 4-byte counter.
 * With 12-byte nonce, it's not safe to use fill it with random (CSPRNG), due to collision chance.
 */
export declare const chacha20: XorStream;
/**
 * XChaCha eXtended-nonce ChaCha. 24-byte nonce.
 * With 24-byte nonce, it's safe to use fill it with random (CSPRNG).
 * https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha
 */
export declare const xchacha20: XorStream;
/**
 * Reduced 8-round chacha, described in original paper.
 */
export declare const chacha8: XorStream;
/**
 * Reduced 12-round chacha, described in original paper.
 */
export declare const chacha12: XorStream;
/**
 * AEAD algorithm from RFC 8439.
 * Salsa20 and chacha (RFC 8439) use poly1305 differently.
 * We could have composed them similar to:
 * https://github.com/paulmillr/scure-base/blob/b266c73dde977b1dd7ef40ef7a23cc15aab526b3/index.ts#L250
 * But it's hard because of authKey:
 * In salsa20, authKey changes position in salsa stream.
 * In chacha, authKey can't be computed inside computeTag, it modifies the counter.
 */
export declare const _poly1305_aead: (xorStream: XorStream) => (key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => CipherWithOutput;
/**
 * ChaCha20-Poly1305 from RFC 8439.
 *
 * Unsafe to use random nonces under the same key, due to collision chance.
 * Prefer XChaCha instead.
 */
export declare const chacha20poly1305: ARXCipher;
/**
 * XChaCha20-Poly1305 extended-nonce chacha.
 *
 * Can be safely used with random nonces (CSPRNG).
 * See [IRTF draft](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha).
 */
export declare const xchacha20poly1305: ARXCipher;
//# sourceMappingURL=chacha.d.ts.map