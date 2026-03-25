/**
 * Decrypting JSON Web Encryption (JWE) in Compact Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * Interface for Compact JWE Decryption dynamic key resolution. No token components have been
 * verified at the time of this function call.
 */
export interface CompactDecryptGetKey extends types.GetKeyFunction<types.CompactJWEHeaderParameters, types.FlattenedJWE> {
}
/**
 * Decrypts a Compact JWE.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwe/compact/decrypt'`.
 *
 * @param jwe Compact JWE.
 * @param key Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function compactDecrypt(jwe: string | Uint8Array, key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.DecryptOptions): Promise<types.CompactDecryptResult>;
/**
 * @param jwe Compact JWE.
 * @param getKey Function resolving Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export declare function compactDecrypt(jwe: string | Uint8Array, getKey: CompactDecryptGetKey, options?: types.DecryptOptions): Promise<types.CompactDecryptResult & types.ResolvedKey>;
