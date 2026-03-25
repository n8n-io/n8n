import { RequestHandler } from 'express';
import { OAuthServerProvider } from '../provider.js';
import { Options as RateLimitOptions } from 'express-rate-limit';
export type AuthorizationHandlerOptions = {
    provider: OAuthServerProvider;
    /**
     * Rate limiting configuration for the authorization endpoint.
     * Set to false to disable rate limiting for this endpoint.
     */
    rateLimit?: Partial<RateLimitOptions> | false;
};
export declare function authorizationHandler({ provider, rateLimit: rateLimitConfig }: AuthorizationHandlerOptions): RequestHandler;
//# sourceMappingURL=authorize.d.ts.map