import type { CompactVerifyResult, FlattenedJWSInput, GetKeyFunction, CompactJWSHeaderParameters, KeyLike, VerifyOptions, ResolvedKey } from '../../types';
/**
 * Interface for Compact JWS Verification dynamic key resolution. No token components have been
 * verified at the time of this function call.
 *
 * @see [createRemoteJWKSet](../functions/jwks_remote.createRemoteJWKSet.md#function-createremotejwkset) to verify using a remote JSON Web Key Set.
 */
export interface CompactVerifyGetKey extends GetKeyFunction<CompactJWSHeaderParameters, FlattenedJWSInput> {
}
/**
 * Verifies the signature and format of and afterwards decodes the Compact JWS.
 *
 * @param jws Compact JWS.
 * @param key Key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function compactVerify(jws: string | Uint8Array, key: KeyLike | Uint8Array, options?: VerifyOptions): Promise<CompactVerifyResult>;
/**
 * @param jws Compact JWS.
 * @param getKey Function resolving a key to verify the JWS with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWS Verify options.
 */
export declare function compactVerify<T extends KeyLike = KeyLike>(jws: string | Uint8Array, getKey: CompactVerifyGetKey, options?: VerifyOptions): Promise<CompactVerifyResult & ResolvedKey<T>>;
