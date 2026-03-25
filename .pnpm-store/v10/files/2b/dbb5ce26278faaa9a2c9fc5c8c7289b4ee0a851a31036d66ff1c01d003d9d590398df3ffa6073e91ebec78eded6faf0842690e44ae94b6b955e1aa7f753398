/**
 * Verifying JSON Web Signature (JWS) in Compact Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * Interface for Compact JWS Verification dynamic key resolution. No token components have been
 * verified at the time of this function call.
 *
 * @see {@link jwks/remote.createRemoteJWKSet createRemoteJWKSet} to verify using a remote JSON Web Key Set.
 */
export interface CompactVerifyGetKey extends types.GenericGetKeyFunction<types.CompactJWSHeaderParameters, types.FlattenedJWSInput, types.CryptoKey | types.KeyObject | types.JWK | Uint8Array> {
}
/**
 * Verifies the signature and format of and afterwards decodes the Compact JWS.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jws/compact/verify'`.
 *
 * @param jws Compact JWS.
 * @param key Key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function compactVerify(jws: string | Uint8Array, key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.VerifyOptions): Promise<types.CompactVerifyResult>;
/**
 * @param jws Compact JWS.
 * @param getKey Function resolving a key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function compactVerify(jws: string | Uint8Array, getKey: CompactVerifyGetKey, options?: types.VerifyOptions): Promise<types.CompactVerifyResult & types.ResolvedKey>;
