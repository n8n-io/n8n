import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SSOOIDCServiceException as __BaseException } from "./SSOOIDCServiceException";
/**
 * <p>You do not have sufficient access to perform this action.</p>
 * @public
 */
export declare class AccessDeniedException extends __BaseException {
    readonly name: "AccessDeniedException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>access_denied</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
/**
 * <p>Indicates that a request to authorize a client with an access user session token is
 *       pending.</p>
 * @public
 */
export declare class AuthorizationPendingException extends __BaseException {
    readonly name: "AuthorizationPendingException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>authorization_pending</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AuthorizationPendingException, __BaseException>);
}
/**
 * <p>This structure contains Amazon Web Services-specific parameter extensions for the token endpoint
 *       responses and includes the identity context.</p>
 * @public
 */
export interface AwsAdditionalDetails {
    /**
     * <p>STS context assertion that carries a user identifier to the Amazon Web Services service that it calls
     *       and can be used to obtain an identity-enhanced IAM role session. This value corresponds to
     *       the <code>sts:identity_context</code> claim in the ID token.</p>
     * @public
     */
    identityContext?: string | undefined;
}
/**
 * @public
 */
export interface CreateTokenRequest {
    /**
     * <p>The unique identifier string for the client or application. This value comes from the
     *       result of the <a>RegisterClient</a> API.</p>
     * @public
     */
    clientId: string | undefined;
    /**
     * <p>A secret string generated for the client. This value should come from the persisted result
     *       of the <a>RegisterClient</a> API.</p>
     * @public
     */
    clientSecret: string | undefined;
    /**
     * <p>Supports the following OAuth grant types: Authorization Code, Device Code, and Refresh
     *       Token. Specify one of the following values, depending on the grant type that you want:</p>
     *          <p>* Authorization Code - <code>authorization_code</code>
     *          </p>
     *          <p>* Device Code - <code>urn:ietf:params:oauth:grant-type:device_code</code>
     *          </p>
     *          <p>* Refresh Token - <code>refresh_token</code>
     *          </p>
     * @public
     */
    grantType: string | undefined;
    /**
     * <p>Used only when calling this API for the Device Code grant type. This short-lived code is
     *       used to identify this authorization request. This comes from the result of the <a>StartDeviceAuthorization</a> API.</p>
     * @public
     */
    deviceCode?: string | undefined;
    /**
     * <p>Used only when calling this API for the Authorization Code grant type. The short-lived
     *       code is used to identify this authorization request.</p>
     * @public
     */
    code?: string | undefined;
    /**
     * <p>Used only when calling this API for the Refresh Token grant type. This token is used to
     *       refresh short-lived tokens, such as the access token, that might expire.</p>
     *          <p>For more information about the features and limitations of the current IAM Identity Center OIDC
     *       implementation, see <i>Considerations for Using this Guide</i> in the <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/Welcome.html">IAM Identity Center
     *         OIDC API Reference</a>.</p>
     * @public
     */
    refreshToken?: string | undefined;
    /**
     * <p>The list of scopes for which authorization is requested. The access token that is issued
     *       is limited to the scopes that are granted. If this value is not specified, IAM Identity Center authorizes
     *       all scopes that are configured for the client during the call to <a>RegisterClient</a>.</p>
     * @public
     */
    scope?: string[] | undefined;
    /**
     * <p>Used only when calling this API for the Authorization Code grant type. This value
     *       specifies the location of the client or application that has registered to receive the
     *       authorization code.</p>
     * @public
     */
    redirectUri?: string | undefined;
    /**
     * <p>Used only when calling this API for the Authorization Code grant type. This value is
     *       generated by the client and presented to validate the original code challenge value the client
     *       passed at authorization time.</p>
     * @public
     */
    codeVerifier?: string | undefined;
}
/**
 * @public
 */
export interface CreateTokenResponse {
    /**
     * <p>A bearer token to access Amazon Web Services accounts and applications assigned to a user.</p>
     * @public
     */
    accessToken?: string | undefined;
    /**
     * <p>Used to notify the client that the returned token is an access token. The supported token
     *       type is <code>Bearer</code>.</p>
     * @public
     */
    tokenType?: string | undefined;
    /**
     * <p>Indicates the time in seconds when an access token will expire.</p>
     * @public
     */
    expiresIn?: number | undefined;
    /**
     * <p>A token that, if present, can be used to refresh a previously issued access token that
     *       might have expired.</p>
     *          <p>For more information about the features and limitations of the current IAM Identity Center OIDC
     *       implementation, see <i>Considerations for Using this Guide</i> in the <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/Welcome.html">IAM Identity Center
     *         OIDC API Reference</a>.</p>
     * @public
     */
    refreshToken?: string | undefined;
    /**
     * <p>The <code>idToken</code> is not implemented or supported. For more information about the
     *       features and limitations of the current IAM Identity Center OIDC implementation, see
     *         <i>Considerations for Using this Guide</i> in the <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/Welcome.html">IAM Identity Center
     *         OIDC API Reference</a>.</p>
     *          <p>A JSON Web Token (JWT) that identifies who is associated with the issued access token.
     *     </p>
     * @public
     */
    idToken?: string | undefined;
}
/**
 * <p>Indicates that the token issued by the service is expired and is no longer valid.</p>
 * @public
 */
export declare class ExpiredTokenException extends __BaseException {
    readonly name: "ExpiredTokenException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>expired_token</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ExpiredTokenException, __BaseException>);
}
/**
 * <p>Indicates that an error from the service occurred while trying to process a
 *       request.</p>
 * @public
 */
export declare class InternalServerException extends __BaseException {
    readonly name: "InternalServerException";
    readonly $fault: "server";
    /**
     * <p>Single error code. For this exception the value will be <code>server_error</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
/**
 * <p>Indicates that the <code>clientId</code> or <code>clientSecret</code> in the request is
 *       invalid. For example, this can occur when a client sends an incorrect <code>clientId</code> or
 *       an expired <code>clientSecret</code>.</p>
 * @public
 */
export declare class InvalidClientException extends __BaseException {
    readonly name: "InvalidClientException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>invalid_client</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidClientException, __BaseException>);
}
/**
 * <p>Indicates that a request contains an invalid grant. This can occur if a client makes a
 *         <a>CreateToken</a> request with an invalid grant type.</p>
 * @public
 */
export declare class InvalidGrantException extends __BaseException {
    readonly name: "InvalidGrantException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>invalid_grant</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidGrantException, __BaseException>);
}
/**
 * <p>Indicates that something is wrong with the input to the request. For example, a required
 *       parameter might be missing or out of range.</p>
 * @public
 */
export declare class InvalidRequestException extends __BaseException {
    readonly name: "InvalidRequestException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>invalid_request</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidRequestException, __BaseException>);
}
/**
 * <p>Indicates that the scope provided in the request is invalid.</p>
 * @public
 */
export declare class InvalidScopeException extends __BaseException {
    readonly name: "InvalidScopeException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>invalid_scope</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidScopeException, __BaseException>);
}
/**
 * <p>Indicates that the client is making the request too frequently and is more than the
 *       service can handle. </p>
 * @public
 */
export declare class SlowDownException extends __BaseException {
    readonly name: "SlowDownException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>slow_down</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<SlowDownException, __BaseException>);
}
/**
 * <p>Indicates that the client is not currently authorized to make the request. This can happen
 *       when a <code>clientId</code> is not issued for a public client.</p>
 * @public
 */
export declare class UnauthorizedClientException extends __BaseException {
    readonly name: "UnauthorizedClientException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>unauthorized_client</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<UnauthorizedClientException, __BaseException>);
}
/**
 * <p>Indicates that the grant type in the request is not supported by the service.</p>
 * @public
 */
export declare class UnsupportedGrantTypeException extends __BaseException {
    readonly name: "UnsupportedGrantTypeException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *         <code>unsupported_grant_type</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<UnsupportedGrantTypeException, __BaseException>);
}
/**
 * @public
 */
export interface CreateTokenWithIAMRequest {
    /**
     * <p>The unique identifier string for the client or application. This value is an application
     *       ARN that has OAuth grants configured.</p>
     * @public
     */
    clientId: string | undefined;
    /**
     * <p>Supports the following OAuth grant types: Authorization Code, Refresh Token, JWT Bearer,
     *       and Token Exchange. Specify one of the following values, depending on the grant type that you
     *       want:</p>
     *          <p>* Authorization Code - <code>authorization_code</code>
     *          </p>
     *          <p>* Refresh Token - <code>refresh_token</code>
     *          </p>
     *          <p>* JWT Bearer - <code>urn:ietf:params:oauth:grant-type:jwt-bearer</code>
     *          </p>
     *          <p>* Token Exchange - <code>urn:ietf:params:oauth:grant-type:token-exchange</code>
     *          </p>
     * @public
     */
    grantType: string | undefined;
    /**
     * <p>Used only when calling this API for the Authorization Code grant type. This short-lived
     *       code is used to identify this authorization request. The code is obtained through a redirect
     *       from IAM Identity Center to a redirect URI persisted in the Authorization Code GrantOptions for the
     *       application.</p>
     * @public
     */
    code?: string | undefined;
    /**
     * <p>Used only when calling this API for the Refresh Token grant type. This token is used to
     *       refresh short-lived tokens, such as the access token, that might expire.</p>
     *          <p>For more information about the features and limitations of the current IAM Identity Center OIDC
     *       implementation, see <i>Considerations for Using this Guide</i> in the <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/Welcome.html">IAM Identity Center
     *         OIDC API Reference</a>.</p>
     * @public
     */
    refreshToken?: string | undefined;
    /**
     * <p>Used only when calling this API for the JWT Bearer grant type. This value specifies the
     *       JSON Web Token (JWT) issued by a trusted token issuer. To authorize a trusted token issuer,
     *       configure the JWT Bearer GrantOptions for the application.</p>
     * @public
     */
    assertion?: string | undefined;
    /**
     * <p>The list of scopes for which authorization is requested. The access token that is issued
     *       is limited to the scopes that are granted. If the value is not specified, IAM Identity Center authorizes all
     *       scopes configured for the application, including the following default scopes:
     *         <code>openid</code>, <code>aws</code>, <code>sts:identity_context</code>.</p>
     * @public
     */
    scope?: string[] | undefined;
    /**
     * <p>Used only when calling this API for the Authorization Code grant type. This value
     *       specifies the location of the client or application that has registered to receive the
     *       authorization code. </p>
     * @public
     */
    redirectUri?: string | undefined;
    /**
     * <p>Used only when calling this API for the Token Exchange grant type. This value specifies
     *       the subject of the exchange. The value of the subject token must be an access token issued by
     *       IAM Identity Center to a different client or application. The access token must have authorized scopes that
     *       indicate the requested application as a target audience.</p>
     * @public
     */
    subjectToken?: string | undefined;
    /**
     * <p>Used only when calling this API for the Token Exchange grant type. This value specifies
     *       the type of token that is passed as the subject of the exchange. The following value is
     *       supported:</p>
     *          <p>* Access Token - <code>urn:ietf:params:oauth:token-type:access_token</code>
     *          </p>
     * @public
     */
    subjectTokenType?: string | undefined;
    /**
     * <p>Used only when calling this API for the Token Exchange grant type. This value specifies
     *       the type of token that the requester can receive. The following values are supported:</p>
     *          <p>* Access Token - <code>urn:ietf:params:oauth:token-type:access_token</code>
     *          </p>
     *          <p>* Refresh Token - <code>urn:ietf:params:oauth:token-type:refresh_token</code>
     *          </p>
     * @public
     */
    requestedTokenType?: string | undefined;
    /**
     * <p>Used only when calling this API for the Authorization Code grant type. This value is
     *       generated by the client and presented to validate the original code challenge value the client
     *       passed at authorization time.</p>
     * @public
     */
    codeVerifier?: string | undefined;
}
/**
 * @public
 */
export interface CreateTokenWithIAMResponse {
    /**
     * <p>A bearer token to access Amazon Web Services accounts and applications assigned to a user.</p>
     * @public
     */
    accessToken?: string | undefined;
    /**
     * <p>Used to notify the requester that the returned token is an access token. The supported
     *       token type is <code>Bearer</code>.</p>
     * @public
     */
    tokenType?: string | undefined;
    /**
     * <p>Indicates the time in seconds when an access token will expire.</p>
     * @public
     */
    expiresIn?: number | undefined;
    /**
     * <p>A token that, if present, can be used to refresh a previously issued access token that
     *       might have expired.</p>
     *          <p>For more information about the features and limitations of the current IAM Identity Center OIDC
     *       implementation, see <i>Considerations for Using this Guide</i> in the <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/Welcome.html">IAM Identity Center
     *         OIDC API Reference</a>.</p>
     * @public
     */
    refreshToken?: string | undefined;
    /**
     * <p>A JSON Web Token (JWT) that identifies the user associated with the issued access token.
     *     </p>
     * @public
     */
    idToken?: string | undefined;
    /**
     * <p>Indicates the type of tokens that are issued by IAM Identity Center. The following values are supported: </p>
     *          <p>* Access Token - <code>urn:ietf:params:oauth:token-type:access_token</code>
     *          </p>
     *          <p>* Refresh Token - <code>urn:ietf:params:oauth:token-type:refresh_token</code>
     *          </p>
     * @public
     */
    issuedTokenType?: string | undefined;
    /**
     * <p>The list of scopes for which authorization is granted. The access token that is issued is
     *       limited to the scopes that are granted.</p>
     * @public
     */
    scope?: string[] | undefined;
    /**
     * <p>A structure containing information from the <code>idToken</code>. Only the
     *         <code>identityContext</code> is in it, which is a value extracted from the
     *         <code>idToken</code>. This provides direct access to identity information without requiring
     *       JWT parsing.</p>
     * @public
     */
    awsAdditionalDetails?: AwsAdditionalDetails | undefined;
}
/**
 * <p>Indicates that a token provided as input to the request was issued by and is only usable
 *       by calling IAM Identity Center endpoints in another region.</p>
 * @public
 */
export declare class InvalidRequestRegionException extends __BaseException {
    readonly name: "InvalidRequestRegionException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>invalid_request</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * <p>Indicates the IAM Identity Center endpoint which the requester may call with this token.</p>
     * @public
     */
    endpoint?: string | undefined;
    /**
     * <p>Indicates the region which the requester may call with this token.</p>
     * @public
     */
    region?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidRequestRegionException, __BaseException>);
}
/**
 * <p>Indicates that the client information sent in the request during registration is
 *       invalid.</p>
 * @public
 */
export declare class InvalidClientMetadataException extends __BaseException {
    readonly name: "InvalidClientMetadataException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *         <code>invalid_client_metadata</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidClientMetadataException, __BaseException>);
}
/**
 * <p>Indicates that one or more redirect URI in the request is not supported for this
 *       operation.</p>
 * @public
 */
export declare class InvalidRedirectUriException extends __BaseException {
    readonly name: "InvalidRedirectUriException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>invalid_redirect_uri</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidRedirectUriException, __BaseException>);
}
/**
 * @public
 */
export interface RegisterClientRequest {
    /**
     * <p>The friendly name of the client.</p>
     * @public
     */
    clientName: string | undefined;
    /**
     * <p>The type of client. The service supports only <code>public</code> as a client type.
     *       Anything other than public will be rejected by the service.</p>
     * @public
     */
    clientType: string | undefined;
    /**
     * <p>The list of scopes that are defined by the client. Upon authorization, this list is used
     *       to restrict permissions when granting an access token.</p>
     * @public
     */
    scopes?: string[] | undefined;
    /**
     * <p>The list of redirect URI that are defined by the client. At completion of authorization,
     *       this list is used to restrict what locations the user agent can be redirected back to.</p>
     * @public
     */
    redirectUris?: string[] | undefined;
    /**
     * <p>The list of OAuth 2.0 grant types that are defined by the client. This list is used to
     *       restrict the token granting flows available to the client. Supports the following OAuth 2.0
     *       grant types: Authorization Code, Device Code, and Refresh Token. </p>
     *          <p>* Authorization Code - <code>authorization_code</code>
     *          </p>
     *          <p>* Device Code - <code>urn:ietf:params:oauth:grant-type:device_code</code>
     *          </p>
     *          <p>* Refresh Token - <code>refresh_token</code>
     *          </p>
     * @public
     */
    grantTypes?: string[] | undefined;
    /**
     * <p>The IAM Identity Center Issuer URL associated with an instance of IAM Identity Center. This value is needed for user
     *       access to resources through the client.</p>
     * @public
     */
    issuerUrl?: string | undefined;
    /**
     * <p>This IAM Identity Center application ARN is used to define administrator-managed configuration for
     *       public client access to resources. At authorization, the scopes, grants, and redirect URI
     *       available to this client will be restricted by this application resource.</p>
     * @public
     */
    entitledApplicationArn?: string | undefined;
}
/**
 * @public
 */
export interface RegisterClientResponse {
    /**
     * <p>The unique identifier string for each client. This client uses this identifier to get
     *       authenticated by the service in subsequent calls.</p>
     * @public
     */
    clientId?: string | undefined;
    /**
     * <p>A secret string generated for the client. The client will use this string to get
     *       authenticated by the service in subsequent calls.</p>
     * @public
     */
    clientSecret?: string | undefined;
    /**
     * <p>Indicates the time at which the <code>clientId</code> and <code>clientSecret</code> were
     *       issued.</p>
     * @public
     */
    clientIdIssuedAt?: number | undefined;
    /**
     * <p>Indicates the time at which the <code>clientId</code> and <code>clientSecret</code> will
     *       become invalid.</p>
     * @public
     */
    clientSecretExpiresAt?: number | undefined;
    /**
     * <p>An endpoint that the client can use to request authorization.</p>
     * @public
     */
    authorizationEndpoint?: string | undefined;
    /**
     * <p>An endpoint that the client can use to create tokens.</p>
     * @public
     */
    tokenEndpoint?: string | undefined;
}
/**
 * @public
 */
export interface StartDeviceAuthorizationRequest {
    /**
     * <p>The unique identifier string for the client that is registered with IAM Identity Center. This value
     *       should come from the persisted result of the <a>RegisterClient</a> API
     *       operation.</p>
     * @public
     */
    clientId: string | undefined;
    /**
     * <p>A secret string that is generated for the client. This value should come from the
     *       persisted result of the <a>RegisterClient</a> API operation.</p>
     * @public
     */
    clientSecret: string | undefined;
    /**
     * <p>The URL for the Amazon Web Services access portal. For more information, see <a href="https://docs.aws.amazon.com/singlesignon/latest/userguide/using-the-portal.html">Using
     *         the Amazon Web Services access portal</a> in the <i>IAM Identity Center User Guide</i>.</p>
     * @public
     */
    startUrl: string | undefined;
}
/**
 * @public
 */
export interface StartDeviceAuthorizationResponse {
    /**
     * <p>The short-lived code that is used by the device when polling for a session token.</p>
     * @public
     */
    deviceCode?: string | undefined;
    /**
     * <p>A one-time user verification code. This is needed to authorize an in-use device.</p>
     * @public
     */
    userCode?: string | undefined;
    /**
     * <p>The URI of the verification page that takes the <code>userCode</code> to authorize the
     *       device.</p>
     * @public
     */
    verificationUri?: string | undefined;
    /**
     * <p>An alternate URL that the client can use to automatically launch a browser. This process
     *       skips the manual step in which the user visits the verification page and enters their
     *       code.</p>
     * @public
     */
    verificationUriComplete?: string | undefined;
    /**
     * <p>Indicates the number of seconds in which the verification code will become invalid.</p>
     * @public
     */
    expiresIn?: number | undefined;
    /**
     * <p>Indicates the number of seconds the client must wait between attempts when polling for a
     *       session.</p>
     * @public
     */
    interval?: number | undefined;
}
/**
 * @internal
 */
export declare const CreateTokenRequestFilterSensitiveLog: (obj: CreateTokenRequest) => any;
/**
 * @internal
 */
export declare const CreateTokenResponseFilterSensitiveLog: (obj: CreateTokenResponse) => any;
/**
 * @internal
 */
export declare const CreateTokenWithIAMRequestFilterSensitiveLog: (obj: CreateTokenWithIAMRequest) => any;
/**
 * @internal
 */
export declare const CreateTokenWithIAMResponseFilterSensitiveLog: (obj: CreateTokenWithIAMResponse) => any;
/**
 * @internal
 */
export declare const RegisterClientResponseFilterSensitiveLog: (obj: RegisterClientResponse) => any;
/**
 * @internal
 */
export declare const StartDeviceAuthorizationRequestFilterSensitiveLog: (obj: StartDeviceAuthorizationRequest) => any;
