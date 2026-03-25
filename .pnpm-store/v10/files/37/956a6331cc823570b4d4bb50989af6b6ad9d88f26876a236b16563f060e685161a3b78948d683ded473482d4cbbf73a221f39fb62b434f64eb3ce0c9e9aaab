import express from 'express';
import { clientRegistrationHandler } from './handlers/register.js';
import { tokenHandler } from './handlers/token.js';
import { authorizationHandler } from './handlers/authorize.js';
import { revocationHandler } from './handlers/revoke.js';
import { metadataHandler } from './handlers/metadata.js';
// Check for dev mode flag that allows HTTP issuer URLs (for development/testing only)
const allowInsecureIssuerUrl = process.env.MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL === 'true' || process.env.MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL === '1';
if (allowInsecureIssuerUrl) {
    // eslint-disable-next-line no-console
    console.warn('MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL is enabled - HTTP issuer URLs are allowed. Do not use in production.');
}
const checkIssuerUrl = (issuer) => {
    // Technically RFC 8414 does not permit a localhost HTTPS exemption, but this will be necessary for ease of testing
    if (issuer.protocol !== 'https:' && issuer.hostname !== 'localhost' && issuer.hostname !== '127.0.0.1' && !allowInsecureIssuerUrl) {
        throw new Error('Issuer URL must be HTTPS');
    }
    if (issuer.hash) {
        throw new Error(`Issuer URL must not have a fragment: ${issuer}`);
    }
    if (issuer.search) {
        throw new Error(`Issuer URL must not have a query string: ${issuer}`);
    }
};
export const createOAuthMetadata = (options) => {
    const issuer = options.issuerUrl;
    const baseUrl = options.baseUrl;
    checkIssuerUrl(issuer);
    const authorization_endpoint = '/authorize';
    const token_endpoint = '/token';
    const registration_endpoint = options.provider.clientsStore.registerClient ? '/register' : undefined;
    const revocation_endpoint = options.provider.revokeToken ? '/revoke' : undefined;
    const metadata = {
        issuer: issuer.href,
        service_documentation: options.serviceDocumentationUrl?.href,
        authorization_endpoint: new URL(authorization_endpoint, baseUrl || issuer).href,
        response_types_supported: ['code'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint: new URL(token_endpoint, baseUrl || issuer).href,
        token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        scopes_supported: options.scopesSupported,
        revocation_endpoint: revocation_endpoint ? new URL(revocation_endpoint, baseUrl || issuer).href : undefined,
        revocation_endpoint_auth_methods_supported: revocation_endpoint ? ['client_secret_post'] : undefined,
        registration_endpoint: registration_endpoint ? new URL(registration_endpoint, baseUrl || issuer).href : undefined
    };
    return metadata;
};
/**
 * Installs standard MCP authorization server endpoints, including dynamic client registration and token revocation (if supported).
 * Also advertises standard authorization server metadata, for easier discovery of supported configurations by clients.
 * Note: if your MCP server is only a resource server and not an authorization server, use mcpAuthMetadataRouter instead.
 *
 * By default, rate limiting is applied to all endpoints to prevent abuse.
 *
 * This router MUST be installed at the application root, like so:
 *
 *  const app = express();
 *  app.use(mcpAuthRouter(...));
 */
export function mcpAuthRouter(options) {
    const oauthMetadata = createOAuthMetadata(options);
    const router = express.Router();
    router.use(new URL(oauthMetadata.authorization_endpoint).pathname, authorizationHandler({ provider: options.provider, ...options.authorizationOptions }));
    router.use(new URL(oauthMetadata.token_endpoint).pathname, tokenHandler({ provider: options.provider, ...options.tokenOptions }));
    router.use(mcpAuthMetadataRouter({
        oauthMetadata,
        // Prefer explicit RS; otherwise fall back to AS baseUrl, then to issuer (back-compat)
        resourceServerUrl: options.resourceServerUrl ?? options.baseUrl ?? new URL(oauthMetadata.issuer),
        serviceDocumentationUrl: options.serviceDocumentationUrl,
        scopesSupported: options.scopesSupported,
        resourceName: options.resourceName
    }));
    if (oauthMetadata.registration_endpoint) {
        router.use(new URL(oauthMetadata.registration_endpoint).pathname, clientRegistrationHandler({
            clientsStore: options.provider.clientsStore,
            ...options.clientRegistrationOptions
        }));
    }
    if (oauthMetadata.revocation_endpoint) {
        router.use(new URL(oauthMetadata.revocation_endpoint).pathname, revocationHandler({ provider: options.provider, ...options.revocationOptions }));
    }
    return router;
}
export function mcpAuthMetadataRouter(options) {
    checkIssuerUrl(new URL(options.oauthMetadata.issuer));
    const router = express.Router();
    const protectedResourceMetadata = {
        resource: options.resourceServerUrl.href,
        authorization_servers: [options.oauthMetadata.issuer],
        scopes_supported: options.scopesSupported,
        resource_name: options.resourceName,
        resource_documentation: options.serviceDocumentationUrl?.href
    };
    // Serve PRM at the path-specific URL per RFC 9728
    const rsPath = new URL(options.resourceServerUrl.href).pathname;
    router.use(`/.well-known/oauth-protected-resource${rsPath === '/' ? '' : rsPath}`, metadataHandler(protectedResourceMetadata));
    // Always add this for OAuth Authorization Server metadata per RFC 8414
    router.use('/.well-known/oauth-authorization-server', metadataHandler(options.oauthMetadata));
    return router;
}
/**
 * Helper function to construct the OAuth 2.0 Protected Resource Metadata URL
 * from a given server URL. This replaces the path with the standard metadata endpoint.
 *
 * @param serverUrl - The base URL of the protected resource server
 * @returns The URL for the OAuth protected resource metadata endpoint
 *
 * @example
 * getOAuthProtectedResourceMetadataUrl(new URL('https://api.example.com/mcp'))
 * // Returns: 'https://api.example.com/.well-known/oauth-protected-resource/mcp'
 */
export function getOAuthProtectedResourceMetadataUrl(serverUrl) {
    const u = new URL(serverUrl.href);
    const rsPath = u.pathname && u.pathname !== '/' ? u.pathname : '';
    return new URL(`/.well-known/oauth-protected-resource${rsPath}`, u).href;
}
//# sourceMappingURL=router.js.map