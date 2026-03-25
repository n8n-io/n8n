import { RequestHandler } from 'express';
import { OAuthServerProvider } from '../provider.js';
import { Options as RateLimitOptions } from 'express-rate-limit';
export type TokenHandlerOptions = {
    provider: OAuthServerProvider;
    /**
     * Rate limiting configuration for the token endpoint.
     * Set to false to disable rate limiting for this endpoint.
     */
    rateLimit?: Partial<RateLimitOptions> | false;
};
export declare function tokenHandler({ provider, rateLimit: rateLimitConfig }: TokenHandlerOptions): RequestHandler;
//# sourceMappingURL=token.d.ts.map