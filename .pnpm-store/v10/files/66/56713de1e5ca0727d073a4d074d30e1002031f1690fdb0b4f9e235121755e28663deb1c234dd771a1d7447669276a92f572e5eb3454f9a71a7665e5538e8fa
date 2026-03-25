import type { KeyLike, DecryptOptions, JWEHeaderParameters, GetKeyFunction, FlattenedJWE, GeneralJWE, GeneralDecryptResult, ResolvedKey } from '../../types';
/**
 * Interface for General JWE Decryption dynamic key resolution. No token components have been
 * verified at the time of this function call.
 */
export interface GeneralDecryptGetKey extends GetKeyFunction<JWEHeaderParameters, FlattenedJWE> {
}
/**
 * Decrypts a General JWE.
 *
 * @param jwe General JWE.
 * @param key Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function generalDecrypt(jwe: GeneralJWE, key: KeyLike | Uint8Array, options?: DecryptOptions): Promise<GeneralDecryptResult>;
/**
 * @param jwe General JWE.
 * @param getKey Function resolving Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function generalDecrypt<T extends KeyLike = KeyLike>(jwe: GeneralJWE, getKey: GeneralDecryptGetKey, options?: DecryptOptions): Promise<GeneralDecryptResult & ResolvedKey<T>>;
