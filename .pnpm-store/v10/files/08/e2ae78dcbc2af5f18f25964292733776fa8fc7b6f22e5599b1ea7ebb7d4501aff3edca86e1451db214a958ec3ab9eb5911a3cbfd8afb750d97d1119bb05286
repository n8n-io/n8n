import { TokenOptions } from './tokenOptions';
/**
 * Interface for the JWT payload required for signing.
 */
interface JwsSignPayload {
    /** The issuer claim for the JWT. */
    iss?: string;
    /** The space-delimited list of scopes for the requested token. */
    scope?: string | string[];
    /** The audience for the token. */
    aud: string;
    /** The expiration time of the token, in seconds since the epoch. */
    exp: number;
    /** The time the token was issued, in seconds since the epoch. */
    iat: number;
    /** The subject claim for the JWT, used for impersonation. */
    sub?: string;
    /** Additional claims to include in the JWT payload. */
    [key: string]: any;
}
/**
 * Builds the JWT payload for signing.
 * @param tokenOptions The options for the token.
 * @returns The JWT payload.
 */
declare function buildPayloadForJwsSign(tokenOptions: TokenOptions): JwsSignPayload;
/**
 * Creates a signed JWS (JSON Web Signature).
 * @param tokenOptions The options for the token.
 * @returns The signed JWS.
 */
declare function getJwsSign(tokenOptions: TokenOptions): string;
export { buildPayloadForJwsSign, getJwsSign };
