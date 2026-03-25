import type { FlattenedVerifyResult, KeyLike, FlattenedJWSInput, JWSHeaderParameters, VerifyOptions, GetKeyFunction, ResolvedKey } from '../../types';
/**
 * Interface for Flattened JWS Verification dynamic key resolution. No token components have been
 * verified at the time of this function call.
 *
 * @see [createRemoteJWKSet](../functions/jwks_remote.createRemoteJWKSet.md#function-createremotejwkset) to verify using a remote JSON Web Key Set.
 */
export interface FlattenedVerifyGetKey extends GetKeyFunction<JWSHeaderParameters | undefined, FlattenedJWSInput> {
}
/**
 * Verifies the signature and format of and afterwards decodes the Flattened JWS.
 *
 * @param jws Flattened JWS.
 * @param key Key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function flattenedVerify(jws: FlattenedJWSInput, key: KeyLike | Uint8Array, options?: VerifyOptions): Promise<FlattenedVerifyResult>;
/**
 * @param jws Flattened JWS.
 * @param getKey Function resolving a key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function flattenedVerify<T extends KeyLike = KeyLike>(jws: FlattenedJWSInput, getKey: FlattenedVerifyGetKey, options?: VerifyOptions): Promise<FlattenedVerifyResult & ResolvedKey<T>>;
