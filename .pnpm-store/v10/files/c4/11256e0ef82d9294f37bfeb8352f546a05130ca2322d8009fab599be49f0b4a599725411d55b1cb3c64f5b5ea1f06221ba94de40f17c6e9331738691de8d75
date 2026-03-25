import type { GeneralJWSInput, GeneralVerifyResult, FlattenedJWSInput, GetKeyFunction, JWSHeaderParameters, KeyLike, VerifyOptions, ResolvedKey } from '../../types';
/**
 * Interface for General JWS Verification dynamic key resolution. No token components have been
 * verified at the time of this function call.
 *
 * @see [createRemoteJWKSet](../functions/jwks_remote.createRemoteJWKSet.md#function-createremotejwkset) to verify using a remote JSON Web Key Set.
 */
export interface GeneralVerifyGetKey extends GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput> {
}
/**
 * Verifies the signature and format of and afterwards decodes the General JWS.
 *
 * @param jws General JWS.
 * @param key Key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function generalVerify(jws: GeneralJWSInput, key: KeyLike | Uint8Array, options?: VerifyOptions): Promise<GeneralVerifyResult>;
/**
 * @param jws General JWS.
 * @param getKey Function resolving a key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function generalVerify<T extends KeyLike = KeyLike>(jws: GeneralJWSInput, getKey: GeneralVerifyGetKey, options?: VerifyOptions): Promise<GeneralVerifyResult & ResolvedKey<T>>;
