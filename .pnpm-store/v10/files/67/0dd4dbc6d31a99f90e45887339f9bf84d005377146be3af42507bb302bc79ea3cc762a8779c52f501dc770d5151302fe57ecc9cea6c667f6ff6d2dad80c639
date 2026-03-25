"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireBearerAuth = requireBearerAuth;
const errors_js_1 = require("../errors.js");
/**
 * Middleware that requires a valid Bearer token in the Authorization header.
 *
 * This will validate the token with the auth provider and add the resulting auth info to the request object.
 *
 * If resourceMetadataUrl is provided, it will be included in the WWW-Authenticate header
 * for 401 responses as per the OAuth 2.0 Protected Resource Metadata spec.
 */
function requireBearerAuth({ verifier, requiredScopes = [], resourceMetadataUrl }) {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new errors_js_1.InvalidTokenError('Missing Authorization header');
            }
            const [type, token] = authHeader.split(' ');
            if (type.toLowerCase() !== 'bearer' || !token) {
                throw new errors_js_1.InvalidTokenError("Invalid Authorization header format, expected 'Bearer TOKEN'");
            }
            const authInfo = await verifier.verifyAccessToken(token);
            // Check if token has the required scopes (if any)
            if (requiredScopes.length > 0) {
                const hasAllScopes = requiredScopes.every(scope => authInfo.scopes.includes(scope));
                if (!hasAllScopes) {
                    throw new errors_js_1.InsufficientScopeError('Insufficient scope');
                }
            }
            // Check if the token is set to expire or if it is expired
            if (typeof authInfo.expiresAt !== 'number' || isNaN(authInfo.expiresAt)) {
                throw new errors_js_1.InvalidTokenError('Token has no expiration time');
            }
            else if (authInfo.expiresAt < Date.now() / 1000) {
                throw new errors_js_1.InvalidTokenError('Token has expired');
            }
            req.auth = authInfo;
            next();
        }
        catch (error) {
            // Build WWW-Authenticate header parts
            const buildWwwAuthHeader = (errorCode, message) => {
                let header = `Bearer error="${errorCode}", error_description="${message}"`;
                if (requiredScopes.length > 0) {
                    header += `, scope="${requiredScopes.join(' ')}"`;
                }
                if (resourceMetadataUrl) {
                    header += `, resource_metadata="${resourceMetadataUrl}"`;
                }
                return header;
            };
            if (error instanceof errors_js_1.InvalidTokenError) {
                res.set('WWW-Authenticate', buildWwwAuthHeader(error.errorCode, error.message));
                res.status(401).json(error.toResponseObject());
            }
            else if (error instanceof errors_js_1.InsufficientScopeError) {
                res.set('WWW-Authenticate', buildWwwAuthHeader(error.errorCode, error.message));
                res.status(403).json(error.toResponseObject());
            }
            else if (error instanceof errors_js_1.ServerError) {
                res.status(500).json(error.toResponseObject());
            }
            else if (error instanceof errors_js_1.OAuthError) {
                res.status(400).json(error.toResponseObject());
            }
            else {
                const serverError = new errors_js_1.ServerError('Internal Server Error');
                res.status(500).json(serverError.toResponseObject());
            }
        }
    };
}
//# sourceMappingURL=bearerAuth.js.map