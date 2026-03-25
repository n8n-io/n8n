import type { FlattenedDecryptResult, KeyLike, FlattenedJWE, JWEHeaderParameters, DecryptOptions, GetKeyFunction, ResolvedKey } from '../../types';
/**
 * Interface for Flattened JWE Decryption dynamic key resolution. No token components have been
 * verified at the time of this function call.
 */
export interface FlattenedDecryptGetKey extends GetKeyFunction<JWEHeaderParameters | undefined, FlattenedJWE> {
}
/**
 * Decrypts a Flattened JWE.
 *
 * @param jwe Flattened JWE.
 * @param key Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function flattenedDecrypt(jwe: FlattenedJWE, key: KeyLike | Uint8Array, options?: DecryptOptions): Promise<FlattenedDecryptResult>;
/**
 * @param jwe Flattened JWE.
 * @param getKey Function resolving Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function flattenedDecrypt<T extends KeyLike = KeyLike>(jwe: FlattenedJWE, getKey: FlattenedDecryptGetKey, options?: DecryptOptions): Promise<FlattenedDecryptResult & ResolvedKey<T>>;
