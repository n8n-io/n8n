import { OAuthClientMetadata, OAuthClientInformationMixed, OAuthTokens, OAuthMetadata, OAuthClientInformationFull, OAuthProtectedResourceMetadata, AuthorizationServerMetadata } from '../shared/auth.js';
import { OAuthError } from '../server/auth/errors.js';
import { FetchLike } from '../shared/transport.js';
/**
 * Function type for adding client authentication to token requests.
 */
export type AddClientAuthentication = (headers: Headers, params: URLSearchParams, url: string | URL, metadata?: AuthorizationServerMetadata) => void | Promise<void>;
/**
 * Implements an end-to-end OAuth client to be used with one MCP server.
 *
 * This client relies upon a concept of an authorized "session," the exact
 * meaning of which is application-defined. Tokens, authorization codes, and
 * code verifiers should not cross different sessions.
 */
export interface OAuthClientProvider {
    /**
     * The URL to redirect the user agent to after authorization.
     * Return undefined for non-interactive flows that don't require user interaction
     * (e.g., client_credentials, jwt-bearer).
     */
    get redirectUrl(): string | URL | undefined;
    /**
     * External URL the server should use to fetch client metadata document
     */
    clientMetadataUrl?: string;
    /**
     * Metadata about this OAuth client.
     */
    get clientMetadata(): OAuthClientMetadata;
    /**
     * Returns a OAuth2 state parameter.
     */
    state?(): string | Promise<string>;
    /**
     * Loads information about this OAuth client, as registered already with the
     * server, or returns `undefined` if the client is not registered with the
     * server.
     */
    clientInformation(): OAuthClientInformationMixed | undefined | Promise<OAuthClientInformationMixed | undefined>;
    /**
     * If implemented, this permits the OAuth client to dynamically register with
     * the server. Client information saved this way should later be read via
     * `clientInformation()`.
     *
     * This method is not required to be implemented if client information is
     * statically known (e.g., pre-registered).
     */
    saveClientInformation?(clientInformation: OAuthClientInformationMixed): void | Promise<void>;
    /**
     * Loads any existing OAuth tokens for the current session, or returns
     * `undefined` if there are no saved tokens.
     */
    tokens(): OAuthTokens | undefined | Promise<OAuthTokens | undefined>;
    /**
     * Stores new OAuth tokens for the current session, after a successful
     * authorization.
     */
    saveTokens(tokens: OAuthTokens): void | Promise<void>;
    /**
     * Invoked to redirect the user agent to the given URL to begin the authorization flow.
     */
    redirectToAuthorization(authorizationUrl: URL): void | Promise<void>;
    /**
     * Saves a PKCE code verifier for the current session, before redirecting to
     * the authorization flow.
     */
    saveCodeVerifier(codeVerifier: string): void | Promise<void>;
    /**
     * Loads the PKCE code verifier for the current session, necessary to validate
     * the authorization result.
     */
    codeVerifier(): string | Promise<string>;
    /**
     * Adds custom client authentication to OAuth token requests.
     *
     * This optional method allows implementations to customize how client credentials
     * are included in token exchange and refresh requests. When provided, this method
     * is called instead of the default authentication logic, giving full control over
     * the authentication mechanism.
     *
     * Common use cases include:
     * - Supporting authentication methods beyond the standard OAuth 2.0 methods
     * - Adding custom headers for proprietary authentication schemes
     * - Implementing client assertion-based authentication (e.g., JWT bearer tokens)
     *
     * @param headers - The request headers (can be modified to add authentication)
     * @param params - The request body parameters (can be modified to add credentials)
     * @param url - The token endpoint URL being called
     * @param metadata - Optional OAuth metadata for the server, which may include supported authentication methods
     */
    addClientAuthentication?: AddClientAuthentication;
    /**
     * If defined, overrides the selection and validation of the
     * RFC 8707 Resource Indicator. If left undefined, default
     * validation behavior will be used.
     *
     * Implementations must verify the returned resource matches the MCP server.
     */
    validateResourceURL?(serverUrl: string | URL, resource?: string): Promise<URL | undefined>;
    /**
     * If implemented, provides a way for the client to invalidate (e.g. delete) the specified
     * credentials, in the case where the server has indicated that they are no longer valid.
     * This avoids requiring the user to intervene manually.
     */
    invalidateCredentials?(scope: 'all' | 'client' | 'tokens' | 'verifier'): void | Promise<void>;
    /**
     * Prepares grant-specific parameters for a token request.
     *
     * This optional method allows providers to customize the token request based on
     * the grant type they support. When implemented, it returns the grant type and
     * any grant-specific parameters needed for the token exchange.
     *
     * If not implemented, the default behavior depends on the flow:
     * - For authorization code flow: uses code, code_verifier, and redirect_uri
     * - For client_credentials: detected via grant_types in clientMetadata
     *
     * @param scope - Optional scope to request
     * @returns Grant type and parameters, or undefined to use default behavior
     *
     * @example
     * // For client_credentials grant:
     * prepareTokenRequest(scope) {
     *   return {
     *     grantType: 'client_credentials',
     *     params: scope ? { scope } : {}
     *   };
     * }
     *
     * @example
     * // For authorization_code grant (default behavior):
     * async prepareTokenRequest() {
     *   return {
     *     grantType: 'authorization_code',
     *     params: {
     *       code: this.authorizationCode,
     *       code_verifier: await this.codeVerifier(),
     *       redirect_uri: String(this.redirectUrl)
     *     }
     *   };
     * }
     */
    prepareTokenRequest?(scope?: string): URLSearchParams | Promise<URLSearchParams | undefined> | undefined;
}
export type AuthResult = 'AUTHORIZED' | 'REDIRECT';
export declare class UnauthorizedError extends Error {
    constructor(message?: string);
}
type ClientAuthMethod = 'client_secret_basic' | 'client_secret_post' | 'none';
/**
 * Determines the best client authentication method to use based on server support and client configuration.
 *
 * Priority order (highest to lowest):
 * 1. client_secret_basic (if client secret is available)
 * 2. client_secret_post (if client secret is available)
 * 3. none (for public clients)
 *
 * @param clientInformation - OAuth client information containing credentials
 * @param supportedMethods - Authentication methods supported by the authorization server
 * @returns The selected authentication method
 */
export declare function selectClientAuthMethod(clientInformation: OAuthClientInformationMixed, supportedMethods: string[]): ClientAuthMethod;
/**
 * Parses an OAuth error response from a string or Response object.
 *
 * If the input is a standard OAuth2.0 error response, it will be parsed according to the spec
 * and an instance of the appropriate OAuthError subclass will be returned.
 * If parsing fails, it falls back to a generic ServerError that includes
 * the response status (if available) and original content.
 *
 * @param input - A Response object or string containing the error response
 * @returns A Promise that resolves to an OAuthError instance
 */
export declare function parseErrorResponse(input: Response | string): Promise<OAuthError>;
/**
 * Orchestrates the full auth flow with a server.
 *
 * This can be used as a single entry point for all authorization functionality,
 * instead of linking together the other lower-level functions in this module.
 */
export declare function auth(provider: OAuthClientProvider, options: {
    serverUrl: string | URL;
    authorizationCode?: string;
    scope?: string;
    resourceMetadataUrl?: URL;
    fetchFn?: FetchLike;
}): Promise<AuthResult>;
/**
 * SEP-991: URL-based Client IDs
 * Validate that the client_id is a valid URL with https scheme
 */
export declare function isHttpsUrl(value?: string): boolean;
export declare function selectResourceURL(serverUrl: string | URL, provider: OAuthClientProvider, resourceMetadata?: OAuthProtectedResourceMetadata): Promise<URL | undefined>;
/**
 * Extract resource_metadata, scope, and error from WWW-Authenticate header.
 */
export declare function extractWWWAuthenticateParams(res: Response): {
    resourceMetadataUrl?: URL;
    scope?: string;
    error?: string;
};
/**
 * Extract resource_metadata from response header.
 * @deprecated Use `extractWWWAuthenticateParams` instead.
 */
export declare function extractResourceMetadataUrl(res: Response): URL | undefined;
/**
 * Looks up RFC 9728 OAuth 2.0 Protected Resource Metadata.
 *
 * If the server returns a 404 for the well-known endpoint, this function will
 * return `undefined`. Any other errors will be thrown as exceptions.
 */
export declare function discoverOAuthProtectedResourceMetadata(serverUrl: string | URL, opts?: {
    protocolVersion?: string;
    resourceMetadataUrl?: string | URL;
}, fetchFn?: FetchLike): Promise<OAuthProtectedResourceMetadata>;
/**
 * Looks up RFC 8414 OAuth 2.0 Authorization Server Metadata.
 *
 * If the server returns a 404 for the well-known endpoint, this function will
 * return `undefined`. Any other errors will be thrown as exceptions.
 *
 * @deprecated This function is deprecated in favor of `discoverAuthorizationServerMetadata`.
 */
export declare function discoverOAuthMetadata(issuer: string | URL, { authorizationServerUrl, protocolVersion }?: {
    authorizationServerUrl?: string | URL;
    protocolVersion?: string;
}, fetchFn?: FetchLike): Promise<OAuthMetadata | undefined>;
/**
 * Builds a list of discovery URLs to try for authorization server metadata.
 * URLs are returned in priority order:
 * 1. OAuth metadata at the given URL
 * 2. OIDC metadata endpoints at the given URL
 */
export declare function buildDiscoveryUrls(authorizationServerUrl: string | URL): {
    url: URL;
    type: 'oauth' | 'oidc';
}[];
/**
 * Discovers authorization server metadata with support for RFC 8414 OAuth 2.0 Authorization Server Metadata
 * and OpenID Connect Discovery 1.0 specifications.
 *
 * This function implements a fallback strategy for authorization server discovery:
 * 1. Attempts RFC 8414 OAuth metadata discovery first
 * 2. If OAuth discovery fails, falls back to OpenID Connect Discovery
 *
 * @param authorizationServerUrl - The authorization server URL obtained from the MCP Server's
 *                                 protected resource metadata, or the MCP server's URL if the
 *                                 metadata was not found.
 * @param options - Configuration options
 * @param options.fetchFn - Optional fetch function for making HTTP requests, defaults to global fetch
 * @param options.protocolVersion - MCP protocol version to use, defaults to LATEST_PROTOCOL_VERSION
 * @returns Promise resolving to authorization server metadata, or undefined if discovery fails
 */
export declare function discoverAuthorizationServerMetadata(authorizationServerUrl: string | URL, { fetchFn, protocolVersion }?: {
    fetchFn?: FetchLike;
    protocolVersion?: string;
}): Promise<AuthorizationServerMetadata | undefined>;
/**
 * Begins the authorization flow with the given server, by generating a PKCE challenge and constructing the authorization URL.
 */
export declare function startAuthorization(authorizationServerUrl: string | URL, { metadata, clientInformation, redirectUrl, scope, state, resource }: {
    metadata?: AuthorizationServerMetadata;
    clientInformation: OAuthClientInformationMixed;
    redirectUrl: string | URL;
    scope?: string;
    state?: string;
    resource?: URL;
}): Promise<{
    authorizationUrl: URL;
    codeVerifier: string;
}>;
/**
 * Prepares token request parameters for an authorization code exchange.
 *
 * This is the default implementation used by fetchToken when the provider
 * doesn't implement prepareTokenRequest.
 *
 * @param authorizationCode - The authorization code received from the authorization endpoint
 * @param codeVerifier - The PKCE code verifier
 * @param redirectUri - The redirect URI used in the authorization request
 * @returns URLSearchParams for the authorization_code grant
 */
export declare function prepareAuthorizationCodeRequest(authorizationCode: string, codeVerifier: string, redirectUri: string | URL): URLSearchParams;
/**
 * Exchanges an authorization code for an access token with the given server.
 *
 * Supports multiple client authentication methods as specified in OAuth 2.1:
 * - Automatically selects the best authentication method based on server support
 * - Falls back to appropriate defaults when server metadata is unavailable
 *
 * @param authorizationServerUrl - The authorization server's base URL
 * @param options - Configuration object containing client info, auth code, etc.
 * @returns Promise resolving to OAuth tokens
 * @throws {Error} When token exchange fails or authentication is invalid
 */
export declare function exchangeAuthorization(authorizationServerUrl: string | URL, { metadata, clientInformation, authorizationCode, codeVerifier, redirectUri, resource, addClientAuthentication, fetchFn }: {
    metadata?: AuthorizationServerMetadata;
    clientInformation: OAuthClientInformationMixed;
    authorizationCode: string;
    codeVerifier: string;
    redirectUri: string | URL;
    resource?: URL;
    addClientAuthentication?: OAuthClientProvider['addClientAuthentication'];
    fetchFn?: FetchLike;
}): Promise<OAuthTokens>;
/**
 * Exchange a refresh token for an updated access token.
 *
 * Supports multiple client authentication methods as specified in OAuth 2.1:
 * - Automatically selects the best authentication method based on server support
 * - Preserves the original refresh token if a new one is not returned
 *
 * @param authorizationServerUrl - The authorization server's base URL
 * @param options - Configuration object containing client info, refresh token, etc.
 * @returns Promise resolving to OAuth tokens (preserves original refresh_token if not replaced)
 * @throws {Error} When token refresh fails or authentication is invalid
 */
export declare function refreshAuthorization(authorizationServerUrl: string | URL, { metadata, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn }: {
    metadata?: AuthorizationServerMetadata;
    clientInformation: OAuthClientInformationMixed;
    refreshToken: string;
    resource?: URL;
    addClientAuthentication?: OAuthClientProvider['addClientAuthentication'];
    fetchFn?: FetchLike;
}): Promise<OAuthTokens>;
/**
 * Unified token fetching that works with any grant type via provider.prepareTokenRequest().
 *
 * This function provides a single entry point for obtaining tokens regardless of the
 * OAuth grant type. The provider's prepareTokenRequest() method determines which grant
 * to use and supplies the grant-specific parameters.
 *
 * @param provider - OAuth client provider that implements prepareTokenRequest()
 * @param authorizationServerUrl - The authorization server's base URL
 * @param options - Configuration for the token request
 * @returns Promise resolving to OAuth tokens
 * @throws {Error} When provider doesn't implement prepareTokenRequest or token fetch fails
 *
 * @example
 * // Provider for client_credentials:
 * class MyProvider implements OAuthClientProvider {
 *   prepareTokenRequest(scope) {
 *     const params = new URLSearchParams({ grant_type: 'client_credentials' });
 *     if (scope) params.set('scope', scope);
 *     return params;
 *   }
 *   // ... other methods
 * }
 *
 * const tokens = await fetchToken(provider, authServerUrl, { metadata });
 */
export declare function fetchToken(provider: OAuthClientProvider, authorizationServerUrl: string | URL, { metadata, resource, authorizationCode, fetchFn }?: {
    metadata?: AuthorizationServerMetadata;
    resource?: URL;
    /** Authorization code for the default authorization_code grant flow */
    authorizationCode?: string;
    fetchFn?: FetchLike;
}): Promise<OAuthTokens>;
/**
 * Performs OAuth 2.0 Dynamic Client Registration according to RFC 7591.
 */
export declare function registerClient(authorizationServerUrl: string | URL, { metadata, clientMetadata, fetchFn }: {
    metadata?: AuthorizationServerMetadata;
    clientMetadata: OAuthClientMetadata;
    fetchFn?: FetchLike;
}): Promise<OAuthClientInformationFull>;
export {};
//# sourceMappingURL=auth.d.ts.map