import type { JWTPayload } from '../types';
/** Generic class for JWT producing. */
export declare class ProduceJWT {
    protected _payload: JWTPayload;
    /** @param payload The JWT Claims Set object. */
    constructor(payload: JWTPayload);
    /**
     * Set "iss" (Issuer) Claim.
     *
     * @param issuer "Issuer" Claim value to set on the JWT Claims Set.
     */
    setIssuer(issuer: string): this;
    /**
     * Set "sub" (Subject) Claim.
     *
     * @param subject "sub" (Subject) Claim value to set on the JWT Claims Set.
     */
    setSubject(subject: string): this;
    /**
     * Set "aud" (Audience) Claim.
     *
     * @param audience "aud" (Audience) Claim value to set on the JWT Claims Set.
     */
    setAudience(audience: string | string[]): this;
    /**
     * Set "jti" (JWT ID) Claim.
     *
     * @param jwtId "jti" (JWT ID) Claim value to set on the JWT Claims Set.
     */
    setJti(jwtId: string): this;
    /**
     * Set "nbf" (Not Before) Claim.
     *
     * @param input "nbf" (Not Before) Claim value to set on the JWT Claims Set. When number is passed
     *   that is used as a value, when string is passed it is resolved to a time span and added to the
     *   current timestamp.
     */
    setNotBefore(input: number | string): this;
    /**
     * Set "exp" (Expiration Time) Claim.
     *
     * @param input "exp" (Expiration Time) Claim value to set on the JWT Claims Set. When number is
     *   passed that is used as a value, when string is passed it is resolved to a time span and added
     *   to the current timestamp.
     */
    setExpirationTime(input: number | string): this;
    /**
     * Set "iat" (Issued At) Claim.
     *
     * @param input "iat" (Issued At) Claim value to set on the JWT Claims Set. Default is current
     *   timestamp.
     */
    setIssuedAt(input?: number): this;
}
