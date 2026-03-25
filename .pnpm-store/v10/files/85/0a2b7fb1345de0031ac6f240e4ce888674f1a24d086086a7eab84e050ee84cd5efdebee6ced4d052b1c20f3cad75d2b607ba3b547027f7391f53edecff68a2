/**
 * JSON Web Token (JWT) Verification (JWT is in JWS format)
 *
 * @module
 */
import type * as types from '../types.d.ts';
/** Combination of JWS Verification options and JWT Claims Set verification options. */
export interface JWTVerifyOptions extends types.VerifyOptions, types.JWTClaimVerificationOptions {
}
/**
 * Interface for JWT Verification dynamic key resolution. No token components have been verified at
 * the time of this function call.
 *
 * @see {@link jwks/remote.createRemoteJWKSet createRemoteJWKSet} to verify using a remote JSON Web Key Set.
 */
export interface JWTVerifyGetKey extends types.GenericGetKeyFunction<types.JWTHeaderParameters, types.FlattenedJWSInput, types.CryptoKey | types.KeyObject | types.JWK | Uint8Array> {
}
/**
 * Verifies the JWT format (to be a JWS Compact format), verifies the JWS signature, validates the
 * JWT Claims Set.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwt/verify'`.
 *
 * @param jwt JSON Web Token value (encoded as JWS).
 * @param key Key to verify the JWT with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWT Decryption and JWT Claims Set validation options.
 */
export declare function jwtVerify<PayloadType = types.JWTPayload>(jwt: string | Uint8Array, key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: JWTVerifyOptions): Promise<types.JWTVerifyResult<PayloadType>>;
/**
 * @param jwt JSON Web Token value (encoded as JWS).
 * @param getKey Function resolving a key to verify the JWT with. See
 *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
 * @param options JWT Decryption and JWT Claims Set validation options.
 */
export declare function jwtVerify<PayloadType = types.JWTPayload>(jwt: string | Uint8Array, getKey: JWTVerifyGetKey, options?: JWTVerifyOptions): Promise<types.JWTVerifyResult<PayloadType> & types.ResolvedKey>;
