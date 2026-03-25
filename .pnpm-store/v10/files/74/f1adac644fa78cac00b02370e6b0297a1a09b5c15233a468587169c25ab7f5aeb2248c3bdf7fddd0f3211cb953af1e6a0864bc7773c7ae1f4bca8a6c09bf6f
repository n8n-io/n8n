import { TokenManager, TokenManagerOptions } from './token-manager';
/** Configuration options for JWT token retrieval. */
export type JwtTokenManagerOptions = TokenManagerOptions;
/**
 * A class for shared functionality for parsing, storing, and requesting
 * JWT tokens. Intended to be used as a parent to be extended for token
 * request management. Child classes should implement `requestToken()`
 * to retrieve the bearer token from intended sources.
 */
export declare class JwtTokenManager extends TokenManager {
    protected tokenName: string;
    protected tokenInfo: any;
    /**
     * Create a new JwtTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    constructor(options: JwtTokenManagerOptions);
    /**
     * Request a JWT using an API key.
     *
     * @returns Promise
     */
    protected requestToken(): Promise<any>;
    /**
     * Save the JWT service response and the calculated expiration time to the object's state.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
}
