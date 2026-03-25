/**
 * OAuth provider extensions for specialized authentication flows.
 *
 * This module provides ready-to-use OAuthClientProvider implementations
 * for common machine-to-machine authentication scenarios.
 */
import { OAuthClientInformation, OAuthClientMetadata, OAuthTokens } from '../shared/auth.js';
import { AddClientAuthentication, OAuthClientProvider } from './auth.js';
/**
 * Helper to produce a private_key_jwt client authentication function.
 *
 * Usage:
 *   const addClientAuth = createPrivateKeyJwtAuth({ issuer, subject, privateKey, alg, audience? });
 *   // pass addClientAuth as provider.addClientAuthentication implementation
 */
export declare function createPrivateKeyJwtAuth(options: {
    issuer: string;
    subject: string;
    privateKey: string | Uint8Array | Record<string, unknown>;
    alg: string;
    audience?: string | URL;
    lifetimeSeconds?: number;
    claims?: Record<string, unknown>;
}): AddClientAuthentication;
/**
 * Options for creating a ClientCredentialsProvider.
 */
export interface ClientCredentialsProviderOptions {
    /**
     * The client_id for this OAuth client.
     */
    clientId: string;
    /**
     * The client_secret for client_secret_basic authentication.
     */
    clientSecret: string;
    /**
     * Optional client name for metadata.
     */
    clientName?: string;
    /**
     * Space-separated scopes values requested by the client.
     */
    scope?: string;
}
/**
 * OAuth provider for client_credentials grant with client_secret_basic authentication.
 *
 * This provider is designed for machine-to-machine authentication where
 * the client authenticates using a client_id and client_secret.
 *
 * @example
 * const provider = new ClientCredentialsProvider({
 *   clientId: 'my-client',
 *   clientSecret: 'my-secret'
 * });
 *
 * const transport = new StreamableHTTPClientTransport(serverUrl, {
 *   authProvider: provider
 * });
 */
export declare class ClientCredentialsProvider implements OAuthClientProvider {
    private _tokens?;
    private _clientInfo;
    private _clientMetadata;
    constructor(options: ClientCredentialsProviderOptions);
    get redirectUrl(): undefined;
    get clientMetadata(): OAuthClientMetadata;
    clientInformation(): OAuthClientInformation;
    saveClientInformation(info: OAuthClientInformation): void;
    tokens(): OAuthTokens | undefined;
    saveTokens(tokens: OAuthTokens): void;
    redirectToAuthorization(): void;
    saveCodeVerifier(): void;
    codeVerifier(): string;
    prepareTokenRequest(scope?: string): URLSearchParams;
}
/**
 * Options for creating a PrivateKeyJwtProvider.
 */
export interface PrivateKeyJwtProviderOptions {
    /**
     * The client_id for this OAuth client.
     */
    clientId: string;
    /**
     * The private key for signing JWT assertions.
     * Can be a PEM string, Uint8Array, or JWK object.
     */
    privateKey: string | Uint8Array | Record<string, unknown>;
    /**
     * The algorithm to use for signing (e.g., 'RS256', 'ES256').
     */
    algorithm: string;
    /**
     * Optional client name for metadata.
     */
    clientName?: string;
    /**
     * Optional JWT lifetime in seconds (default: 300).
     */
    jwtLifetimeSeconds?: number;
    /**
     * Space-separated scopes values requested by the client.
     */
    scope?: string;
}
/**
 * OAuth provider for client_credentials grant with private_key_jwt authentication.
 *
 * This provider is designed for machine-to-machine authentication where
 * the client authenticates using a signed JWT assertion (RFC 7523 Section 2.2).
 *
 * @example
 * const provider = new PrivateKeyJwtProvider({
 *   clientId: 'my-client',
 *   privateKey: pemEncodedPrivateKey,
 *   algorithm: 'RS256'
 * });
 *
 * const transport = new StreamableHTTPClientTransport(serverUrl, {
 *   authProvider: provider
 * });
 */
export declare class PrivateKeyJwtProvider implements OAuthClientProvider {
    private _tokens?;
    private _clientInfo;
    private _clientMetadata;
    addClientAuthentication: AddClientAuthentication;
    constructor(options: PrivateKeyJwtProviderOptions);
    get redirectUrl(): undefined;
    get clientMetadata(): OAuthClientMetadata;
    clientInformation(): OAuthClientInformation;
    saveClientInformation(info: OAuthClientInformation): void;
    tokens(): OAuthTokens | undefined;
    saveTokens(tokens: OAuthTokens): void;
    redirectToAuthorization(): void;
    saveCodeVerifier(): void;
    codeVerifier(): string;
    prepareTokenRequest(scope?: string): URLSearchParams;
}
/**
 * Options for creating a StaticPrivateKeyJwtProvider.
 */
export interface StaticPrivateKeyJwtProviderOptions {
    /**
     * The client_id for this OAuth client.
     */
    clientId: string;
    /**
     * A pre-built JWT client assertion to use for authentication.
     *
     * This token should already contain the appropriate claims
     * (iss, sub, aud, exp, etc.) and be signed by the client's key.
     */
    jwtBearerAssertion: string;
    /**
     * Optional client name for metadata.
     */
    clientName?: string;
    /**
     * Space-separated scopes values requested by the client.
     */
    scope?: string;
}
/**
 * OAuth provider for client_credentials grant with a static private_key_jwt assertion.
 *
 * This provider mirrors {@link PrivateKeyJwtProvider} but instead of constructing and
 * signing a JWT on each request, it accepts a pre-built JWT assertion string and
 * uses it directly for authentication.
 */
export declare class StaticPrivateKeyJwtProvider implements OAuthClientProvider {
    private _tokens?;
    private _clientInfo;
    private _clientMetadata;
    addClientAuthentication: AddClientAuthentication;
    constructor(options: StaticPrivateKeyJwtProviderOptions);
    get redirectUrl(): undefined;
    get clientMetadata(): OAuthClientMetadata;
    clientInformation(): OAuthClientInformation;
    saveClientInformation(info: OAuthClientInformation): void;
    tokens(): OAuthTokens | undefined;
    saveTokens(tokens: OAuthTokens): void;
    redirectToAuthorization(): void;
    saveCodeVerifier(): void;
    codeVerifier(): string;
    prepareTokenRequest(scope?: string): URLSearchParams;
}
//# sourceMappingURL=auth-extensions.d.ts.map