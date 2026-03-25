import pkceChallenge from 'pkce-challenge';
import { LATEST_PROTOCOL_VERSION } from '../types.js';
import { OAuthErrorResponseSchema, OpenIdProviderDiscoveryMetadataSchema } from '../shared/auth.js';
import { OAuthClientInformationFullSchema, OAuthMetadataSchema, OAuthProtectedResourceMetadataSchema, OAuthTokensSchema } from '../shared/auth.js';
import { checkResourceAllowed, resourceUrlFromServerUrl } from '../shared/auth-utils.js';
import { InvalidClientError, InvalidClientMetadataError, InvalidGrantError, OAUTH_ERRORS, OAuthError, ServerError, UnauthorizedClientError } from '../server/auth/errors.js';
export class UnauthorizedError extends Error {
    constructor(message) {
        super(message ?? 'Unauthorized');
    }
}
function isClientAuthMethod(method) {
    return ['client_secret_basic', 'client_secret_post', 'none'].includes(method);
}
const AUTHORIZATION_CODE_RESPONSE_TYPE = 'code';
const AUTHORIZATION_CODE_CHALLENGE_METHOD = 'S256';
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
export function selectClientAuthMethod(clientInformation, supportedMethods) {
    const hasClientSecret = clientInformation.client_secret !== undefined;
    // If server doesn't specify supported methods, use RFC 6749 defaults
    if (supportedMethods.length === 0) {
        return hasClientSecret ? 'client_secret_post' : 'none';
    }
    // Prefer the method returned by the server during client registration if valid and supported
    if ('token_endpoint_auth_method' in clientInformation &&
        clientInformation.token_endpoint_auth_method &&
        isClientAuthMethod(clientInformation.token_endpoint_auth_method) &&
        supportedMethods.includes(clientInformation.token_endpoint_auth_method)) {
        return clientInformation.token_endpoint_auth_method;
    }
    // Try methods in priority order (most secure first)
    if (hasClientSecret && supportedMethods.includes('client_secret_basic')) {
        return 'client_secret_basic';
    }
    if (hasClientSecret && supportedMethods.includes('client_secret_post')) {
        return 'client_secret_post';
    }
    if (supportedMethods.includes('none')) {
        return 'none';
    }
    // Fallback: use what we have
    return hasClientSecret ? 'client_secret_post' : 'none';
}
/**
 * Applies client authentication to the request based on the specified method.
 *
 * Implements OAuth 2.1 client authentication methods:
 * - client_secret_basic: HTTP Basic authentication (RFC 6749 Section 2.3.1)
 * - client_secret_post: Credentials in request body (RFC 6749 Section 2.3.1)
 * - none: Public client authentication (RFC 6749 Section 2.1)
 *
 * @param method - The authentication method to use
 * @param clientInformation - OAuth client information containing credentials
 * @param headers - HTTP headers object to modify
 * @param params - URL search parameters to modify
 * @throws {Error} When required credentials are missing
 */
function applyClientAuthentication(method, clientInformation, headers, params) {
    const { client_id, client_secret } = clientInformation;
    switch (method) {
        case 'client_secret_basic':
            applyBasicAuth(client_id, client_secret, headers);
            return;
        case 'client_secret_post':
            applyPostAuth(client_id, client_secret, params);
            return;
        case 'none':
            applyPublicAuth(client_id, params);
            return;
        default:
            throw new Error(`Unsupported client authentication method: ${method}`);
    }
}
/**
 * Applies HTTP Basic authentication (RFC 6749 Section 2.3.1)
 */
function applyBasicAuth(clientId, clientSecret, headers) {
    if (!clientSecret) {
        throw new Error('client_secret_basic authentication requires a client_secret');
    }
    const credentials = btoa(`${clientId}:${clientSecret}`);
    headers.set('Authorization', `Basic ${credentials}`);
}
/**
 * Applies POST body authentication (RFC 6749 Section 2.3.1)
 */
function applyPostAuth(clientId, clientSecret, params) {
    params.set('client_id', clientId);
    if (clientSecret) {
        params.set('client_secret', clientSecret);
    }
}
/**
 * Applies public client authentication (RFC 6749 Section 2.1)
 */
function applyPublicAuth(clientId, params) {
    params.set('client_id', clientId);
}
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
export async function parseErrorResponse(input) {
    const statusCode = input instanceof Response ? input.status : undefined;
    const body = input instanceof Response ? await input.text() : input;
    try {
        const result = OAuthErrorResponseSchema.parse(JSON.parse(body));
        const { error, error_description, error_uri } = result;
        const errorClass = OAUTH_ERRORS[error] || ServerError;
        return new errorClass(error_description || '', error_uri);
    }
    catch (error) {
        // Not a valid OAuth error response, but try to inform the user of the raw data anyway
        const errorMessage = `${statusCode ? `HTTP ${statusCode}: ` : ''}Invalid OAuth error response: ${error}. Raw body: ${body}`;
        return new ServerError(errorMessage);
    }
}
/**
 * Orchestrates the full auth flow with a server.
 *
 * This can be used as a single entry point for all authorization functionality,
 * instead of linking together the other lower-level functions in this module.
 */
export async function auth(provider, options) {
    try {
        return await authInternal(provider, options);
    }
    catch (error) {
        // Handle recoverable error types by invalidating credentials and retrying
        if (error instanceof InvalidClientError || error instanceof UnauthorizedClientError) {
            await provider.invalidateCredentials?.('all');
            return await authInternal(provider, options);
        }
        else if (error instanceof InvalidGrantError) {
            await provider.invalidateCredentials?.('tokens');
            return await authInternal(provider, options);
        }
        // Throw otherwise
        throw error;
    }
}
async function authInternal(provider, { serverUrl, authorizationCode, scope, resourceMetadataUrl, fetchFn }) {
    let resourceMetadata;
    let authorizationServerUrl;
    try {
        resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl, { resourceMetadataUrl }, fetchFn);
        if (resourceMetadata.authorization_servers && resourceMetadata.authorization_servers.length > 0) {
            authorizationServerUrl = resourceMetadata.authorization_servers[0];
        }
    }
    catch {
        // Ignore errors and fall back to /.well-known/oauth-authorization-server
    }
    /**
     * If we don't get a valid authorization server metadata from protected resource metadata,
     * fallback to the legacy MCP spec's implementation (version 2025-03-26): MCP server base URL acts as the Authorization server.
     */
    if (!authorizationServerUrl) {
        authorizationServerUrl = new URL('/', serverUrl);
    }
    const resource = await selectResourceURL(serverUrl, provider, resourceMetadata);
    const metadata = await discoverAuthorizationServerMetadata(authorizationServerUrl, {
        fetchFn
    });
    // Handle client registration if needed
    let clientInformation = await Promise.resolve(provider.clientInformation());
    if (!clientInformation) {
        if (authorizationCode !== undefined) {
            throw new Error('Existing OAuth client information is required when exchanging an authorization code');
        }
        const supportsUrlBasedClientId = metadata?.client_id_metadata_document_supported === true;
        const clientMetadataUrl = provider.clientMetadataUrl;
        if (clientMetadataUrl && !isHttpsUrl(clientMetadataUrl)) {
            throw new InvalidClientMetadataError(`clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`);
        }
        const shouldUseUrlBasedClientId = supportsUrlBasedClientId && clientMetadataUrl;
        if (shouldUseUrlBasedClientId) {
            // SEP-991: URL-based Client IDs
            clientInformation = {
                client_id: clientMetadataUrl
            };
            await provider.saveClientInformation?.(clientInformation);
        }
        else {
            // Fallback to dynamic registration
            if (!provider.saveClientInformation) {
                throw new Error('OAuth client information must be saveable for dynamic registration');
            }
            const fullInformation = await registerClient(authorizationServerUrl, {
                metadata,
                clientMetadata: provider.clientMetadata,
                fetchFn
            });
            await provider.saveClientInformation(fullInformation);
            clientInformation = fullInformation;
        }
    }
    // Non-interactive flows (e.g., client_credentials, jwt-bearer) don't need a redirect URL
    const nonInteractiveFlow = !provider.redirectUrl;
    // Exchange authorization code for tokens, or fetch tokens directly for non-interactive flows
    if (authorizationCode !== undefined || nonInteractiveFlow) {
        const tokens = await fetchToken(provider, authorizationServerUrl, {
            metadata,
            resource,
            authorizationCode,
            fetchFn
        });
        await provider.saveTokens(tokens);
        return 'AUTHORIZED';
    }
    const tokens = await provider.tokens();
    // Handle token refresh or new authorization
    if (tokens?.refresh_token) {
        try {
            // Attempt to refresh the token
            const newTokens = await refreshAuthorization(authorizationServerUrl, {
                metadata,
                clientInformation,
                refreshToken: tokens.refresh_token,
                resource,
                addClientAuthentication: provider.addClientAuthentication,
                fetchFn
            });
            await provider.saveTokens(newTokens);
            return 'AUTHORIZED';
        }
        catch (error) {
            // If this is a ServerError, or an unknown type, log it out and try to continue. Otherwise, escalate so we can fix things and retry.
            if (!(error instanceof OAuthError) || error instanceof ServerError) {
                // Could not refresh OAuth tokens
            }
            else {
                // Refresh failed for another reason, re-throw
                throw error;
            }
        }
    }
    const state = provider.state ? await provider.state() : undefined;
    // Start new authorization flow
    const { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        state,
        redirectUrl: provider.redirectUrl,
        scope: scope || resourceMetadata?.scopes_supported?.join(' ') || provider.clientMetadata.scope,
        resource
    });
    await provider.saveCodeVerifier(codeVerifier);
    await provider.redirectToAuthorization(authorizationUrl);
    return 'REDIRECT';
}
/**
 * SEP-991: URL-based Client IDs
 * Validate that the client_id is a valid URL with https scheme
 */
export function isHttpsUrl(value) {
    if (!value)
        return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.pathname !== '/';
    }
    catch {
        return false;
    }
}
export async function selectResourceURL(serverUrl, provider, resourceMetadata) {
    const defaultResource = resourceUrlFromServerUrl(serverUrl);
    // If provider has custom validation, delegate to it
    if (provider.validateResourceURL) {
        return await provider.validateResourceURL(defaultResource, resourceMetadata?.resource);
    }
    // Only include resource parameter when Protected Resource Metadata is present
    if (!resourceMetadata) {
        return undefined;
    }
    // Validate that the metadata's resource is compatible with our request
    if (!checkResourceAllowed({ requestedResource: defaultResource, configuredResource: resourceMetadata.resource })) {
        throw new Error(`Protected resource ${resourceMetadata.resource} does not match expected ${defaultResource} (or origin)`);
    }
    // Prefer the resource from metadata since it's what the server is telling us to request
    return new URL(resourceMetadata.resource);
}
/**
 * Extract resource_metadata, scope, and error from WWW-Authenticate header.
 */
export function extractWWWAuthenticateParams(res) {
    const authenticateHeader = res.headers.get('WWW-Authenticate');
    if (!authenticateHeader) {
        return {};
    }
    const [type, scheme] = authenticateHeader.split(' ');
    if (type.toLowerCase() !== 'bearer' || !scheme) {
        return {};
    }
    const resourceMetadataMatch = extractFieldFromWwwAuth(res, 'resource_metadata') || undefined;
    let resourceMetadataUrl;
    if (resourceMetadataMatch) {
        try {
            resourceMetadataUrl = new URL(resourceMetadataMatch);
        }
        catch {
            // Ignore invalid URL
        }
    }
    const scope = extractFieldFromWwwAuth(res, 'scope') || undefined;
    const error = extractFieldFromWwwAuth(res, 'error') || undefined;
    return {
        resourceMetadataUrl,
        scope,
        error
    };
}
/**
 * Extracts a specific field's value from the WWW-Authenticate header string.
 *
 * @param response The HTTP response object containing the headers.
 * @param fieldName The name of the field to extract (e.g., "realm", "nonce").
 * @returns The field value
 */
function extractFieldFromWwwAuth(response, fieldName) {
    const wwwAuthHeader = response.headers.get('WWW-Authenticate');
    if (!wwwAuthHeader) {
        return null;
    }
    const pattern = new RegExp(`${fieldName}=(?:"([^"]+)"|([^\\s,]+))`);
    const match = wwwAuthHeader.match(pattern);
    if (match) {
        // Pattern matches: field_name="value" or field_name=value (unquoted)
        return match[1] || match[2];
    }
    return null;
}
/**
 * Extract resource_metadata from response header.
 * @deprecated Use `extractWWWAuthenticateParams` instead.
 */
export function extractResourceMetadataUrl(res) {
    const authenticateHeader = res.headers.get('WWW-Authenticate');
    if (!authenticateHeader) {
        return undefined;
    }
    const [type, scheme] = authenticateHeader.split(' ');
    if (type.toLowerCase() !== 'bearer' || !scheme) {
        return undefined;
    }
    const regex = /resource_metadata="([^"]*)"/;
    const match = regex.exec(authenticateHeader);
    if (!match) {
        return undefined;
    }
    try {
        return new URL(match[1]);
    }
    catch {
        return undefined;
    }
}
/**
 * Looks up RFC 9728 OAuth 2.0 Protected Resource Metadata.
 *
 * If the server returns a 404 for the well-known endpoint, this function will
 * return `undefined`. Any other errors will be thrown as exceptions.
 */
export async function discoverOAuthProtectedResourceMetadata(serverUrl, opts, fetchFn = fetch) {
    const response = await discoverMetadataWithFallback(serverUrl, 'oauth-protected-resource', fetchFn, {
        protocolVersion: opts?.protocolVersion,
        metadataUrl: opts?.resourceMetadataUrl
    });
    if (!response || response.status === 404) {
        await response?.body?.cancel();
        throw new Error(`Resource server does not implement OAuth 2.0 Protected Resource Metadata.`);
    }
    if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`);
    }
    return OAuthProtectedResourceMetadataSchema.parse(await response.json());
}
/**
 * Helper function to handle fetch with CORS retry logic
 */
async function fetchWithCorsRetry(url, headers, fetchFn = fetch) {
    try {
        return await fetchFn(url, { headers });
    }
    catch (error) {
        if (error instanceof TypeError) {
            if (headers) {
                // CORS errors come back as TypeError, retry without headers
                return fetchWithCorsRetry(url, undefined, fetchFn);
            }
            else {
                // We're getting CORS errors on retry too, return undefined
                return undefined;
            }
        }
        throw error;
    }
}
/**
 * Constructs the well-known path for auth-related metadata discovery
 */
function buildWellKnownPath(wellKnownPrefix, pathname = '', options = {}) {
    // Strip trailing slash from pathname to avoid double slashes
    if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }
    return options.prependPathname ? `${pathname}/.well-known/${wellKnownPrefix}` : `/.well-known/${wellKnownPrefix}${pathname}`;
}
/**
 * Tries to discover OAuth metadata at a specific URL
 */
async function tryMetadataDiscovery(url, protocolVersion, fetchFn = fetch) {
    const headers = {
        'MCP-Protocol-Version': protocolVersion
    };
    return await fetchWithCorsRetry(url, headers, fetchFn);
}
/**
 * Determines if fallback to root discovery should be attempted
 */
function shouldAttemptFallback(response, pathname) {
    return !response || (response.status >= 400 && response.status < 500 && pathname !== '/');
}
/**
 * Generic function for discovering OAuth metadata with fallback support
 */
async function discoverMetadataWithFallback(serverUrl, wellKnownType, fetchFn, opts) {
    const issuer = new URL(serverUrl);
    const protocolVersion = opts?.protocolVersion ?? LATEST_PROTOCOL_VERSION;
    let url;
    if (opts?.metadataUrl) {
        url = new URL(opts.metadataUrl);
    }
    else {
        // Try path-aware discovery first
        const wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname);
        url = new URL(wellKnownPath, opts?.metadataServerUrl ?? issuer);
        url.search = issuer.search;
    }
    let response = await tryMetadataDiscovery(url, protocolVersion, fetchFn);
    // If path-aware discovery fails with 404 and we're not already at root, try fallback to root discovery
    if (!opts?.metadataUrl && shouldAttemptFallback(response, issuer.pathname)) {
        const rootUrl = new URL(`/.well-known/${wellKnownType}`, issuer);
        response = await tryMetadataDiscovery(rootUrl, protocolVersion, fetchFn);
    }
    return response;
}
/**
 * Looks up RFC 8414 OAuth 2.0 Authorization Server Metadata.
 *
 * If the server returns a 404 for the well-known endpoint, this function will
 * return `undefined`. Any other errors will be thrown as exceptions.
 *
 * @deprecated This function is deprecated in favor of `discoverAuthorizationServerMetadata`.
 */
export async function discoverOAuthMetadata(issuer, { authorizationServerUrl, protocolVersion } = {}, fetchFn = fetch) {
    if (typeof issuer === 'string') {
        issuer = new URL(issuer);
    }
    if (!authorizationServerUrl) {
        authorizationServerUrl = issuer;
    }
    if (typeof authorizationServerUrl === 'string') {
        authorizationServerUrl = new URL(authorizationServerUrl);
    }
    protocolVersion ?? (protocolVersion = LATEST_PROTOCOL_VERSION);
    const response = await discoverMetadataWithFallback(authorizationServerUrl, 'oauth-authorization-server', fetchFn, {
        protocolVersion,
        metadataServerUrl: authorizationServerUrl
    });
    if (!response || response.status === 404) {
        await response?.body?.cancel();
        return undefined;
    }
    if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status} trying to load well-known OAuth metadata`);
    }
    return OAuthMetadataSchema.parse(await response.json());
}
/**
 * Builds a list of discovery URLs to try for authorization server metadata.
 * URLs are returned in priority order:
 * 1. OAuth metadata at the given URL
 * 2. OIDC metadata endpoints at the given URL
 */
export function buildDiscoveryUrls(authorizationServerUrl) {
    const url = typeof authorizationServerUrl === 'string' ? new URL(authorizationServerUrl) : authorizationServerUrl;
    const hasPath = url.pathname !== '/';
    const urlsToTry = [];
    if (!hasPath) {
        // Root path: https://example.com/.well-known/oauth-authorization-server
        urlsToTry.push({
            url: new URL('/.well-known/oauth-authorization-server', url.origin),
            type: 'oauth'
        });
        // OIDC: https://example.com/.well-known/openid-configuration
        urlsToTry.push({
            url: new URL(`/.well-known/openid-configuration`, url.origin),
            type: 'oidc'
        });
        return urlsToTry;
    }
    // Strip trailing slash from pathname to avoid double slashes
    let pathname = url.pathname;
    if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }
    // 1. OAuth metadata at the given URL
    // Insert well-known before the path: https://example.com/.well-known/oauth-authorization-server/tenant1
    urlsToTry.push({
        url: new URL(`/.well-known/oauth-authorization-server${pathname}`, url.origin),
        type: 'oauth'
    });
    // 2. OIDC metadata endpoints
    // RFC 8414 style: Insert /.well-known/openid-configuration before the path
    urlsToTry.push({
        url: new URL(`/.well-known/openid-configuration${pathname}`, url.origin),
        type: 'oidc'
    });
    // OIDC Discovery 1.0 style: Append /.well-known/openid-configuration after the path
    urlsToTry.push({
        url: new URL(`${pathname}/.well-known/openid-configuration`, url.origin),
        type: 'oidc'
    });
    return urlsToTry;
}
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
export async function discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn = fetch, protocolVersion = LATEST_PROTOCOL_VERSION } = {}) {
    const headers = {
        'MCP-Protocol-Version': protocolVersion,
        Accept: 'application/json'
    };
    // Get the list of URLs to try
    const urlsToTry = buildDiscoveryUrls(authorizationServerUrl);
    // Try each URL in order
    for (const { url: endpointUrl, type } of urlsToTry) {
        const response = await fetchWithCorsRetry(endpointUrl, headers, fetchFn);
        if (!response) {
            /**
             * CORS error occurred - don't throw as the endpoint may not allow CORS,
             * continue trying other possible endpoints
             */
            continue;
        }
        if (!response.ok) {
            await response.body?.cancel();
            // Continue looking for any 4xx response code.
            if (response.status >= 400 && response.status < 500) {
                continue; // Try next URL
            }
            throw new Error(`HTTP ${response.status} trying to load ${type === 'oauth' ? 'OAuth' : 'OpenID provider'} metadata from ${endpointUrl}`);
        }
        // Parse and validate based on type
        if (type === 'oauth') {
            return OAuthMetadataSchema.parse(await response.json());
        }
        else {
            return OpenIdProviderDiscoveryMetadataSchema.parse(await response.json());
        }
    }
    return undefined;
}
/**
 * Begins the authorization flow with the given server, by generating a PKCE challenge and constructing the authorization URL.
 */
export async function startAuthorization(authorizationServerUrl, { metadata, clientInformation, redirectUrl, scope, state, resource }) {
    let authorizationUrl;
    if (metadata) {
        authorizationUrl = new URL(metadata.authorization_endpoint);
        if (!metadata.response_types_supported.includes(AUTHORIZATION_CODE_RESPONSE_TYPE)) {
            throw new Error(`Incompatible auth server: does not support response type ${AUTHORIZATION_CODE_RESPONSE_TYPE}`);
        }
        if (metadata.code_challenge_methods_supported &&
            !metadata.code_challenge_methods_supported.includes(AUTHORIZATION_CODE_CHALLENGE_METHOD)) {
            throw new Error(`Incompatible auth server: does not support code challenge method ${AUTHORIZATION_CODE_CHALLENGE_METHOD}`);
        }
    }
    else {
        authorizationUrl = new URL('/authorize', authorizationServerUrl);
    }
    // Generate PKCE challenge
    const challenge = await pkceChallenge();
    const codeVerifier = challenge.code_verifier;
    const codeChallenge = challenge.code_challenge;
    authorizationUrl.searchParams.set('response_type', AUTHORIZATION_CODE_RESPONSE_TYPE);
    authorizationUrl.searchParams.set('client_id', clientInformation.client_id);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', AUTHORIZATION_CODE_CHALLENGE_METHOD);
    authorizationUrl.searchParams.set('redirect_uri', String(redirectUrl));
    if (state) {
        authorizationUrl.searchParams.set('state', state);
    }
    if (scope) {
        authorizationUrl.searchParams.set('scope', scope);
    }
    if (scope?.includes('offline_access')) {
        // if the request includes the OIDC-only "offline_access" scope,
        // we need to set the prompt to "consent" to ensure the user is prompted to grant offline access
        // https://openid.net/specs/openid-connect-core-1_0.html#OfflineAccess
        authorizationUrl.searchParams.append('prompt', 'consent');
    }
    if (resource) {
        authorizationUrl.searchParams.set('resource', resource.href);
    }
    return { authorizationUrl, codeVerifier };
}
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
export function prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri) {
    return new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        code_verifier: codeVerifier,
        redirect_uri: String(redirectUri)
    });
}
/**
 * Internal helper to execute a token request with the given parameters.
 * Used by exchangeAuthorization, refreshAuthorization, and fetchToken.
 */
async function executeTokenRequest(authorizationServerUrl, { metadata, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn }) {
    const tokenUrl = metadata?.token_endpoint ? new URL(metadata.token_endpoint) : new URL('/token', authorizationServerUrl);
    const headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
    });
    if (resource) {
        tokenRequestParams.set('resource', resource.href);
    }
    if (addClientAuthentication) {
        await addClientAuthentication(headers, tokenRequestParams, tokenUrl, metadata);
    }
    else if (clientInformation) {
        const supportedMethods = metadata?.token_endpoint_auth_methods_supported ?? [];
        const authMethod = selectClientAuthMethod(clientInformation, supportedMethods);
        applyClientAuthentication(authMethod, clientInformation, headers, tokenRequestParams);
    }
    const response = await (fetchFn ?? fetch)(tokenUrl, {
        method: 'POST',
        headers,
        body: tokenRequestParams
    });
    if (!response.ok) {
        throw await parseErrorResponse(response);
    }
    return OAuthTokensSchema.parse(await response.json());
}
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
export async function exchangeAuthorization(authorizationServerUrl, { metadata, clientInformation, authorizationCode, codeVerifier, redirectUri, resource, addClientAuthentication, fetchFn }) {
    const tokenRequestParams = prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri);
    return executeTokenRequest(authorizationServerUrl, {
        metadata,
        tokenRequestParams,
        clientInformation,
        addClientAuthentication,
        resource,
        fetchFn
    });
}
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
export async function refreshAuthorization(authorizationServerUrl, { metadata, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn }) {
    const tokenRequestParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });
    const tokens = await executeTokenRequest(authorizationServerUrl, {
        metadata,
        tokenRequestParams,
        clientInformation,
        addClientAuthentication,
        resource,
        fetchFn
    });
    // Preserve original refresh token if server didn't return a new one
    return { refresh_token: refreshToken, ...tokens };
}
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
export async function fetchToken(provider, authorizationServerUrl, { metadata, resource, authorizationCode, fetchFn } = {}) {
    const scope = provider.clientMetadata.scope;
    // Use provider's prepareTokenRequest if available, otherwise fall back to authorization_code
    let tokenRequestParams;
    if (provider.prepareTokenRequest) {
        tokenRequestParams = await provider.prepareTokenRequest(scope);
    }
    // Default to authorization_code grant if no custom prepareTokenRequest
    if (!tokenRequestParams) {
        if (!authorizationCode) {
            throw new Error('Either provider.prepareTokenRequest() or authorizationCode is required');
        }
        if (!provider.redirectUrl) {
            throw new Error('redirectUrl is required for authorization_code flow');
        }
        const codeVerifier = await provider.codeVerifier();
        tokenRequestParams = prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, provider.redirectUrl);
    }
    const clientInformation = await provider.clientInformation();
    return executeTokenRequest(authorizationServerUrl, {
        metadata,
        tokenRequestParams,
        clientInformation: clientInformation ?? undefined,
        addClientAuthentication: provider.addClientAuthentication,
        resource,
        fetchFn
    });
}
/**
 * Performs OAuth 2.0 Dynamic Client Registration according to RFC 7591.
 */
export async function registerClient(authorizationServerUrl, { metadata, clientMetadata, fetchFn }) {
    let registrationUrl;
    if (metadata) {
        if (!metadata.registration_endpoint) {
            throw new Error('Incompatible auth server: does not support dynamic client registration');
        }
        registrationUrl = new URL(metadata.registration_endpoint);
    }
    else {
        registrationUrl = new URL('/register', authorizationServerUrl);
    }
    const response = await (fetchFn ?? fetch)(registrationUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientMetadata)
    });
    if (!response.ok) {
        throw await parseErrorResponse(response);
    }
    return OAuthClientInformationFullSchema.parse(await response.json());
}
//# sourceMappingURL=auth.js.map