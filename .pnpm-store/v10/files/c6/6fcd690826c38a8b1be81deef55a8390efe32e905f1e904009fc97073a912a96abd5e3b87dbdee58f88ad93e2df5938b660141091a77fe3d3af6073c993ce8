import { RequestHandler } from 'express';
import { OAuthTokenVerifier } from '../provider.js';
import { AuthInfo } from '../types.js';
export type BearerAuthMiddlewareOptions = {
    /**
     * A provider used to verify tokens.
     */
    verifier: OAuthTokenVerifier;
    /**
     * Optional scopes that the token must have.
     */
    requiredScopes?: string[];
    /**
     * Optional resource metadata URL to include in WWW-Authenticate header.
     */
    resourceMetadataUrl?: string;
};
declare module 'express-serve-static-core' {
    interface Request {
        /**
         * Information about the validated access token, if the `requireBearerAuth` middleware was used.
         */
        auth?: AuthInfo;
    }
}
/**
 * Middleware that requires a valid Bearer token in the Authorization header.
 *
 * This will validate the token with the auth provider and add the resulting auth info to the request object.
 *
 * If resourceMetadataUrl is provided, it will be included in the WWW-Authenticate header
 * for 401 responses as per the OAuth 2.0 Protected Resource Metadata spec.
 */
export declare function requireBearerAuth({ verifier, requiredScopes, resourceMetadataUrl }: BearerAuthMiddlewareOptions): RequestHandler;
//# sourceMappingURL=bearerAuth.d.ts.map