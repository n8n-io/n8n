import type { KeyLike, DecryptOptions, CompactJWEHeaderParameters, GetKeyFunction, FlattenedJWE, CompactDecryptResult, ResolvedKey } from '../../types';
/**
 * Interface for Compact JWE Decryption dynamic key resolution. No token components have been
 * verified at the time of this function call.
 */
export interface CompactDecryptGetKey extends GetKeyFunction<CompactJWEHeaderParameters, FlattenedJWE> {
}
/**
 * Decrypts a Compact JWE.
 *
 * @param jwe Compact JWE.
 * @param key Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function compactDecrypt(jwe: string | Uint8Array, key: KeyLike | Uint8Array, options?: DecryptOptions): Promise<CompactDecryptResult>;
/**
 * @param jwe Compact JWE.
 * @param getKey Function resolving Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function compactDecrypt<T extends KeyLike = KeyLike>(jwe: string | Uint8Array, getKey: CompactDecryptGetKey, options?: DecryptOptions): Promise<CompactDecryptResult & ResolvedKey<T>>;
