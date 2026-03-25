/**
 * Decrypting JSON Web Encryption (JWE) in Flattened JSON Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * Interface for Flattened JWE Decryption dynamic key resolution. No token components have been
 * verified at the time of this function call.
 */
export interface FlattenedDecryptGetKey extends types.GetKeyFunction<types.JWEHeaderParameters | undefined, types.FlattenedJWE> {
}
/**
 * Decrypts a Flattened JWE.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwe/flattened/decrypt'`.
 *
 * @param jwe Flattened JWE.
 * @param key Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function flattenedDecrypt(jwe: types.FlattenedJWE, key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.DecryptOptions): Promise<types.FlattenedDecryptResult>;
/**
 * @param jwe Flattened JWE.
 * @param getKey Function resolving Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function flattenedDecrypt(jwe: types.FlattenedJWE, getKey: FlattenedDecryptGetKey, options?: types.DecryptOptions): Promise<types.FlattenedDecryptResult & types.ResolvedKey>;
