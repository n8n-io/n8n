import express, { RequestHandler } from 'express';
import { ClientRegistrationHandlerOptions } from './handlers/register.js';
import { TokenHandlerOptions } from './handlers/token.js';
import { AuthorizationHandlerOptions } from './handlers/authorize.js';
import { RevocationHandlerOptions } from './handlers/revoke.js';
import { OAuthServerProvider } from './provider.js';
import { OAuthMetadata } from '../../shared/auth.js';
export type AuthRouterOptions = {
    /**
     * A provider implementing the actual authorization logic for this router.
     */
    provider: OAuthServerProvider;
    /**
     * The authorization server's issuer identifier, which is a URL that uses the "https" scheme and has no query or fragment components.
     */
    issuerUrl: URL;
    /**
     * The base URL of the authorization server to use for the metadata endpoints.
     *
     * If not provided, the issuer URL will be used as the base URL.
     */
    baseUrl?: URL;
    /**
     * An optional URL of a page containing human-readable information that developers might want or need to know when using the authorization server.
     */
    serviceDocumentationUrl?: URL;
    /**
     * An optional list of scopes supported by this authorization server
     */
    scopesSupported?: string[];
    /**
     * The resource name to be displayed in protected resource metadata
     */
    resourceName?: string;
    /**
     * The URL of the protected resource (RS) whose metadata we advertise.
     * If not provided, falls back to `baseUrl` and then to `issuerUrl` (AS=RS).
     */
    resourceServerUrl?: URL;
    authorizationOptions?: Omit<AuthorizationHandlerOptions, 'provider'>;
    clientRegistrationOptions?: Omit<ClientRegistrationHandlerOptions, 'clientsStore'>;
    revocationOptions?: Omit<RevocationHandlerOptions, 'provider'>;
    tokenOptions?: Omit<TokenHandlerOptions, 'provider'>;
};
export declare const createOAuthMetadata: (options: {
    provider: OAuthServerProvider;
    issuerUrl: URL;
    baseUrl?: URL;
    serviceDocumentationUrl?: URL;
    scopesSupported?: string[];
}) => OAuthMetadata;
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
export declare function mcpAuthRouter(options: AuthRouterOptions): RequestHandler;
export type AuthMetadataOptions = {
    /**
     * OAuth Metadata as would be returned from the authorization server
     * this MCP server relies on
     */
    oauthMetadata: OAuthMetadata;
    /**
     * The url of the MCP server, for use in protected resource metadata
     */
    resourceServerUrl: URL;
    /**
     * The url for documentation for the MCP server
     */
    serviceDocumentationUrl?: URL;
    /**
     * An optional list of scopes supported by this MCP server
     */
    scopesSupported?: string[];
    /**
     * An optional resource name to display in resource metadata
     */
    resourceName?: string;
};
export declare function mcpAuthMetadataRouter(options: AuthMetadataOptions): express.Router;
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
export declare function getOAuthProtectedResourceMetadataUrl(serverUrl: URL): string;
//# sourceMappingURL=router.d.ts.map