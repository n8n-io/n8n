import type { OAuth2Flow } from "./oauth2Flows.js";
/**
 * Options used when creating and sending get OAuth 2 requests for this operation.
 */
export interface GetOAuth2TokenOptions {
    /** Abort signal for the request */
    abortSignal?: AbortSignal;
}
/**
 * Options used when creating and sending get bearer token requests for this operation.
 */
export interface GetBearerTokenOptions {
    /** Abort signal for the request */
    abortSignal?: AbortSignal;
}
/**
 * Credential for OAuth2 authentication flows.
 */
export interface OAuth2TokenCredential<TFlows extends OAuth2Flow> {
    /**
     * Gets an OAuth2 token for the specified flows.
     * @param flows - The OAuth2 flows to use.
     * @param options - Options for the request.
     * @returns - a valid access token which was obtained through one of the flows specified in `flows`.
     */
    getOAuth2Token(flows: TFlows[], options?: GetOAuth2TokenOptions): Promise<string>;
}
/**
 * Credential for Bearer token authentication.
 */
export interface BearerTokenCredential {
    /**
     * Gets a Bearer token for the specified flows.
     * @param options - Options for the request.
     * @returns - a valid access token.
     */
    getBearerToken(options?: GetBearerTokenOptions): Promise<string>;
}
/**
 * Credential for HTTP Basic authentication.
 * Provides username and password for basic authentication headers.
 */
export interface BasicCredential {
    /** The username for basic authentication. */
    username: string;
    /** The password for basic authentication. */
    password: string;
}
/**
 * Credential for API Key authentication.
 * Provides an API key that will be used in the request headers.
 */
export interface ApiKeyCredential {
    /** The API key for authentication. */
    key: string;
}
/**
 * Union type of all supported authentication credentials.
 */
export type ClientCredential = OAuth2TokenCredential<OAuth2Flow> | BearerTokenCredential | BasicCredential | ApiKeyCredential;
/**
 * Type guard to check if a credential is an OAuth2 token credential.
 */
export declare function isOAuth2TokenCredential(credential: ClientCredential): credential is OAuth2TokenCredential<OAuth2Flow>;
/**
 * Type guard to check if a credential is a Bearer token credential.
 */
export declare function isBearerTokenCredential(credential: ClientCredential): credential is BearerTokenCredential;
/**
 * Type guard to check if a credential is a Basic auth credential.
 */
export declare function isBasicCredential(credential: ClientCredential): credential is BasicCredential;
/**
 * Type guard to check if a credential is an API key credential.
 */
export declare function isApiKeyCredential(credential: ClientCredential): credential is ApiKeyCredential;
//# sourceMappingURL=credentials.d.ts.map