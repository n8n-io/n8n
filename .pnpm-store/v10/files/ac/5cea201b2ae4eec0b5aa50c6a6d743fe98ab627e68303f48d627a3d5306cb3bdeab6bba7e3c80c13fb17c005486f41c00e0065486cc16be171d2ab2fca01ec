import type { KeyLike, DecryptOptions, JWTClaimVerificationOptions, GetKeyFunction, CompactJWEHeaderParameters, FlattenedJWE, JWTDecryptResult, ResolvedKey } from '../types';
/** Combination of JWE Decryption options and JWT Claims Set verification options. */
export interface JWTDecryptOptions extends DecryptOptions, JWTClaimVerificationOptions {
}
/**
 * Interface for JWT Decryption dynamic key resolution. No token components have been verified at
 * the time of this function call.
 */
export interface JWTDecryptGetKey extends GetKeyFunction<CompactJWEHeaderParameters, FlattenedJWE> {
}
/**
 * Verifies the JWT format (to be a JWE Compact format), decrypts the ciphertext, validates the JWT
 * Claims Set.
 *
 * @param jwt JSON Web Token value (encoded as JWE).
 * @param key Private Key or Secret to decrypt and verify the JWT with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWT Decryption and JWT Claims Set validation options.
 */
export declare function jwtDecrypt(jwt: string | Uint8Array, key: KeyLike | Uint8Array, options?: JWTDecryptOptions): Promise<JWTDecryptResult>;
/**
 * @param jwt JSON Web Token value (encoded as JWE).
 * @param getKey Function resolving Private Key or Secret to decrypt and verify the JWT with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWT Decryption and JWT Claims Set validation options.
 */
export declare function jwtDecrypt<T extends KeyLike = KeyLike>(jwt: string | Uint8Array, getKey: JWTDecryptGetKey, options?: JWTDecryptOptions): Promise<JWTDecryptResult & ResolvedKey<T>>;
