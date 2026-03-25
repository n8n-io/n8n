import { Gaxios, GaxiosOptions } from 'gaxios';
/**
 * OAuth error codes.
 * https://tools.ietf.org/html/rfc6749#section-5.2
 */
type OAuthErrorCode = 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' | string;
/**
 * The standard OAuth error response.
 * https://tools.ietf.org/html/rfc6749#section-5.2
 */
export interface OAuthErrorResponse {
    error: OAuthErrorCode;
    error_description?: string;
    error_uri?: string;
}
/**
 * OAuth client authentication types.
 * https://tools.ietf.org/html/rfc6749#section-2.3
 */
export type ConfidentialClientType = 'basic' | 'request-body';
/**
 * Defines the client authentication credentials for basic and request-body
 * credentials.
 * https://tools.ietf.org/html/rfc6749#section-2.3.1
 */
export interface ClientAuthentication {
    confidentialClientType: ConfidentialClientType;
    clientId: string;
    clientSecret?: string;
}
export interface OAuthClientAuthHandlerOptions {
    /**
     * Defines the client authentication credentials for basic and request-body
     * credentials.
     */
    clientAuthentication?: ClientAuthentication;
    /**
     * An optional transporter to use.
     */
    transporter?: Gaxios;
}
/**
 * Abstract class for handling client authentication in OAuth-based
 * operations.
 * When request-body client authentication is used, only application/json and
 * application/x-www-form-urlencoded content types for HTTP methods that support
 * request bodies are supported.
 */
export declare abstract class OAuthClientAuthHandler {
    #private;
    protected transporter: Gaxios;
    /**
     * Instantiates an OAuth client authentication handler.
     * @param options The OAuth Client Auth Handler instance options. Passing an `ClientAuthentication` directly is **@DEPRECATED**.
     */
    constructor(options?: ClientAuthentication | OAuthClientAuthHandlerOptions);
    /**
     * Applies client authentication on the OAuth request's headers or POST
     * body but does not process the request.
     * @param opts The GaxiosOptions whose headers or data are to be modified
     *   depending on the client authentication mechanism to be used.
     * @param bearerToken The optional bearer token to use for authentication.
     *   When this is used, no client authentication credentials are needed.
     */
    protected applyClientAuthenticationOptions(opts: GaxiosOptions, bearerToken?: string): void;
    /**
     * Applies client authentication on the request's header if either
     * basic authentication or bearer token authentication is selected.
     *
     * @param opts The GaxiosOptions whose headers or data are to be modified
     *   depending on the client authentication mechanism to be used.
     * @param bearerToken The optional bearer token to use for authentication.
     *   When this is used, no client authentication credentials are needed.
     */
    private injectAuthenticatedHeaders;
    /**
     * Applies client authentication on the request's body if request-body
     * client authentication is selected.
     *
     * @param opts The GaxiosOptions whose headers or data are to be modified
     *   depending on the client authentication mechanism to be used.
     */
    private injectAuthenticatedRequestBody;
    /**
     * Retry config for Auth-related requests.
     *
     * @remarks
     *
     * This is not a part of the default {@link AuthClient.transporter transporter/gaxios}
     * config as some downstream APIs would prefer if customers explicitly enable retries,
     * such as GCS.
     */
    protected static get RETRY_CONFIG(): GaxiosOptions;
}
/**
 * Converts an OAuth error response to a native JavaScript Error.
 * @param resp The OAuth error response to convert to a native Error object.
 * @param err The optional original error. If provided, the error properties
 *   will be copied to the new error.
 * @return The converted native Error object.
 */
export declare function getErrorFromOAuthErrorResponse(resp: OAuthErrorResponse, err?: Error): Error;
export {};
