import { OAuthServerProvider } from '../provider.js';
import { RequestHandler } from 'express';
import { Options as RateLimitOptions } from 'express-rate-limit';
export type RevocationHandlerOptions = {
    provider: OAuthServerProvider;
    /**
     * Rate limiting configuration for the token revocation endpoint.
     * Set to false to disable rate limiting for this endpoint.
     */
    rateLimit?: Partial<RateLimitOptions> | false;
};
export declare function revocationHandler({ provider, rateLimit: rateLimitConfig }: RevocationHandlerOptions): RequestHandler;
//# sourceMappingURL=revoke.d.ts.map