/**
 * JSON Web Token (JWT) Decryption (JWT is in JWE format)
 *
 * @module
 */
import type * as types from '../types.d.ts';
/** Combination of JWE Decryption options and JWT Claims Set verification options. */
export interface JWTDecryptOptions extends types.DecryptOptions, types.JWTClaimVerificationOptions {
}
/**
 * Interface for JWT Decryption dynamic key resolution. No token components have been verified at
 * the time of this function call.
 */
export interface JWTDecryptGetKey extends types.GetKeyFunction<types.CompactJWEHeaderParameters, types.FlattenedJWE> {
}
/**
 * Verifies the JWT format (to be a JWE Compact format), decrypts the ciphertext, validates the JWT
 * Claims Set.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwt/decrypt'`.
 *
 * @param jwt JSON Web Token value (encoded as JWE).
 * @param key Private Key or Secret to decrypt and verify the JWT with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWT Decryption and JWT Claims Set validation options.
 */
export declare function jwtDecrypt<PayloadType = types.JWTPayload>(jwt: string | Uint8Array, key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: JWTDecryptOptions): Promise<types.JWTDecryptResult<PayloadType>>;
/**
 * @param jwt JSON Web Token value (encoded as JWE).
 * @param getKey Function resolving Private Key or Secret to decrypt and verify the JWT with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWT Decryption and JWT Claims Set validation options.
 */
export declare function jwtDecrypt<PayloadType = types.JWTPayload>(jwt: string | Uint8Array, getKey: JWTDecryptGetKey, options?: JWTDecryptOptions): Promise<types.JWTDecryptResult<PayloadType> & types.ResolvedKey>;
