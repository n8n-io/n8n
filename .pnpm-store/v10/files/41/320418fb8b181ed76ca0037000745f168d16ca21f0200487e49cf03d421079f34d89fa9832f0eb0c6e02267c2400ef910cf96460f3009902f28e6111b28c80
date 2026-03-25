/**
 * Unsecured (unsigned & unencrypted) JSON Web Tokens (JWT)
 *
 * @module
 */
import type * as types from '../types.d.ts';
/** Result of decoding an Unsecured JWT. */
export interface UnsecuredResult<PayloadType = types.JWTPayload> {
    payload: PayloadType & types.JWTPayload;
    header: types.JWSHeaderParameters;
}
/**
 * The UnsecuredJWT class is a utility for dealing with `{ "alg": "none" }` Unsecured JWTs.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwt/unsecured'`.
 *
 */
export declare class UnsecuredJWT implements types.ProduceJWT {
    #private;
    /**
     * {@link UnsecuredJWT} constructor
     *
     * @param payload The JWT Claims Set object. Defaults to an empty object.
     */
    constructor(payload?: types.JWTPayload);
    /** Encodes the Unsecured JWT. */
    encode(): string;
    setIssuer(issuer: string): this;
    setSubject(subject: string): this;
    setAudience(audience: string | string[]): this;
    setJti(jwtId: string): this;
    setNotBefore(input: number | string | Date): this;
    setExpirationTime(input: number | string | Date): this;
    setIssuedAt(input?: number | string | Date): this;
    /**
     * Decodes an unsecured JWT.
     *
     * @param jwt Unsecured JWT to decode the payload of.
     * @param options JWT Claims Set validation options.
     */
    static decode<PayloadType = types.JWTPayload>(jwt: string, options?: types.JWTClaimVerificationOptions): UnsecuredResult<PayloadType>;
}
