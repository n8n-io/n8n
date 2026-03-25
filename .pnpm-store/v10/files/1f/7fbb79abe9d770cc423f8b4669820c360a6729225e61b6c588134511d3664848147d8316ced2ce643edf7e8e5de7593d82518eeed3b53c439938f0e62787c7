/**
 * JSON Web Token (JWT) Signing (JWT is in JWS format)
 *
 * @module
 */
import type * as types from '../types.d.ts';
/**
 * The SignJWT class is used to build and sign Compact JWS formatted JSON Web Tokens.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwt/sign'`.
 *
 */
export declare class SignJWT implements types.ProduceJWT {
    #private;
    /**
     * {@link SignJWT} constructor
     *
     * @param payload The JWT Claims Set object. Defaults to an empty object.
     */
    constructor(payload?: types.JWTPayload);
    setIssuer(issuer: string): this;
    setSubject(subject: string): this;
    setAudience(audience: string | string[]): this;
    setJti(jwtId: string): this;
    setNotBefore(input: number | string | Date): this;
    setExpirationTime(input: number | string | Date): this;
    setIssuedAt(input?: number | string | Date): this;
    /**
     * Sets the JWS Protected Header on the SignJWT object.
     *
     * @param protectedHeader JWS Protected Header. Must contain an "alg" (JWS Algorithm) property.
     */
    setProtectedHeader(protectedHeader: types.JWTHeaderParameters): this;
    /**
     * Signs and returns the JWT.
     *
     * @param key Private Key or Secret to sign the JWT with. See
     *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
     * @param options JWT Sign options.
     */
    sign(key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array, options?: types.SignOptions): Promise<string>;
}
