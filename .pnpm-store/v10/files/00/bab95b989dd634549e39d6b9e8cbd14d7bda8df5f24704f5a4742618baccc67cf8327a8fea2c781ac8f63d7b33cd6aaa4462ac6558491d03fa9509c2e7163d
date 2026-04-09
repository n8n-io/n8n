/**
 * Verifying JSON Web Signature (JWS) in General JSON Serialization
 *
 * @module
 */
import type * as types from '../../types.d.ts';
/**
 * Interface for General JWS Verification dynamic key resolution. No token components have been
 * verified at the time of this function call.
 *
 * @see {@link jwks/remote.createRemoteJWKSet createRemoteJWKSet} to verify using a remote JSON Web Key Set.
 */
export interface GeneralVerifyGetKey extends types.GenericGetKeyFunction<types.JWSHeaderParameters, types.FlattenedJWSInput, types.CryptoKey | types.KeyObject | types.JWK | Uint8Array> {
}
/**
 * Verifies the signature and format of and afterwards decodes the General JWS.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jws/general/verify'`.
 *
 * > [!NOTE]\
 * > The function iterates over the `signatures` array in the General JWS and returns the verification
 * > result of the first signature entry that can be successfully verified. The result only contains
 * > the payload, protected header, and unprotected header of that successfully verified signature
 * > entry. Other signature entries in the General JWS are not validated, and their headers are not
 * > included in the returned result. Recipients of a General JWS should only rely on the returned
 * > (verified) data.
 *
 * @param jws General JWS.
 * @param key Key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function generalVerify(jws: types.GeneralJWSInput, key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.VerifyOptions): Promise<types.GeneralVerifyResult>;
/**
 * @param jws General JWS.
 * @param getKey Function resolving a key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function generalVerify(jws: types.GeneralJWSInput, getKey: GeneralVerifyGetKey, options?: types.VerifyOptions): Promise<types.GeneralVerifyResult & types.ResolvedKey>;
