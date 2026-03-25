import { RequestHandler } from 'express';
import { OAuthRegisteredClientsStore } from '../clients.js';
import { Options as RateLimitOptions } from 'express-rate-limit';
export type ClientRegistrationHandlerOptions = {
    /**
     * A store used to save information about dynamically registered OAuth clients.
     */
    clientsStore: OAuthRegisteredClientsStore;
    /**
     * The number of seconds after which to expire issued client secrets, or 0 to prevent expiration of client secrets (not recommended).
     *
     * If not set, defaults to 30 days.
     */
    clientSecretExpirySeconds?: number;
    /**
     * Rate limiting configuration for the client registration endpoint.
     * Set to false to disable rate limiting for this endpoint.
     * Registration endpoints are particularly sensitive to abuse and should be rate limited.
     */
    rateLimit?: Partial<RateLimitOptions> | false;
    /**
     * Whether to generate a client ID before calling the client registration endpoint.
     *
     * If not set, defaults to true.
     */
    clientIdGeneration?: boolean;
};
export declare function clientRegistrationHandler({ clientsStore, clientSecretExpirySeconds, rateLimit: rateLimitConfig, clientIdGeneration }: ClientRegistrationHandlerOptions): RequestHandler;
//# sourceMappingURL=register.d.ts.map