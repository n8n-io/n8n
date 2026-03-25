import { type CHash, type Input } from './utils.ts';
/**
 * HKDF-extract from spec. Less important part. `HKDF-Extract(IKM, salt) -> PRK`
 * Arguments position differs from spec (IKM is first one, since it is not optional)
 * @param hash - hash function that would be used (e.g. sha256)
 * @param ikm - input keying material, the initial key
 * @param salt - optional salt value (a non-secret random value)
 */
export declare function extract(hash: CHash, ikm: Input, salt?: Input): Uint8Array;
/**
 * HKDF-expand from the spec. The most important part. `HKDF-Expand(PRK, info, L) -> OKM`
 * @param hash - hash function that would be used (e.g. sha256)
 * @param prk - a pseudorandom key of at least HashLen octets (usually, the output from the extract step)
 * @param info - optional context and application specific information (can be a zero-length string)
 * @param length - length of output keying material in bytes
 */
export declare function expand(hash: CHash, prk: Input, info?: Input, length?: number): Uint8Array;
/**
 * HKDF (RFC 5869): derive keys from an initial input.
 * Combines hkdf_extract + hkdf_expand in one step
 * @param hash - hash function that would be used (e.g. sha256)
 * @param ikm - input keying material, the initial key
 * @param salt - optional salt value (a non-secret random value)
 * @param info - optional context and application specific information (can be a zero-length string)
 * @param length - length of output keying material in bytes
 * @example
 * import { hkdf } from '@noble/hashes/hkdf';
 * import { sha256 } from '@noble/hashes/sha2';
 * import { randomBytes } from '@noble/hashes/utils';
 * const inputKey = randomBytes(32);
 * const salt = randomBytes(32);
 * const info = 'application-key';
 * const hk1 = hkdf(sha256, inputKey, salt, info, 32);
 */
export declare const hkdf: (hash: CHash, ikm: Input, salt: Input | undefined, info: Input | undefined, length: number) => Uint8Array;
//# sourceMappingURL=hkdf.d.ts.map