/**
 * Decrypting JSON Web Encryption (JWE) in General JSON Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * Interface for General JWE Decryption dynamic key resolution. No token components have been
 * verified at the time of this function call.
 */
export interface GeneralDecryptGetKey extends types.GetKeyFunction<types.JWEHeaderParameters, types.FlattenedJWE> {
}
/**
 * Decrypts a General JWE.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwe/general/decrypt'`.
 *
 * @param jwe General JWE.
 * @param key Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function generalDecrypt(jwe: types.GeneralJWE, key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.DecryptOptions): Promise<types.GeneralDecryptResult>;
/**
 * @param jwe General JWE.
 * @param getKey Function resolving Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function generalDecrypt(jwe: types.GeneralJWE, getKey: GeneralDecryptGetKey, options?: types.DecryptOptions): Promise<types.GeneralDecryptResult & types.ResolvedKey>;
