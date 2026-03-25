import { GaxiosError, GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
import * as querystring from 'querystring';
import { JwkCertificate } from '../crypto/crypto';
import { BodyResponseCallback } from '../transporters';
import { AuthClient, AuthClientOptions } from './authclient';
import { Credentials } from './credentials';
import { LoginTicket } from './loginticket';
/**
 * The results from the `generateCodeVerifierAsync` method.  To learn more,
 * See the sample:
 * https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/oauth2-codeVerifier.js
 */
export interface CodeVerifierResults {
    /**
     * The code verifier that will be used when calling `getToken` to obtain a new
     * access token.
     */
    codeVerifier: string;
    /**
     * The code_challenge that should be sent with the `generateAuthUrl` call
     * to obtain a verifiable authentication url.
     */
    codeChallenge?: string;
}
export interface Certificates {
    [index: string]: string | JwkCertificate;
}
export interface PublicKeys {
    [index: string]: string;
}
export interface Headers {
    [index: string]: string;
}
export declare enum CodeChallengeMethod {
    Plain = "plain",
    S256 = "S256"
}
export declare enum CertificateFormat {
    PEM = "PEM",
    JWK = "JWK"
}
/**
 * The client authentication type. Supported values are basic, post, and none.
 * https://datatracker.ietf.org/doc/html/rfc7591#section-2
 */
export declare enum ClientAuthentication {
    ClientSecretPost = "ClientSecretPost",
    ClientSecretBasic = "ClientSecretBasic",
    None = "None"
}
export interface GetTokenOptions {
    code: string;
    codeVerifier?: string;
    /**
     * The client ID for your application. The value passed into the constructor
     * will be used if not provided. Must match any client_id option passed to
     * a corresponding call to generateAuthUrl.
     */
    client_id?: string;
    /**
     * Determines where the API server redirects the user after the user
     * completes the authorization flow. The value passed into the constructor
     * will be used if not provided. Must match any redirect_uri option passed to
     * a corresponding call to generateAuthUrl.
     */
    redirect_uri?: string;
}
export interface TokenInfo {
    /**
     * The application that is the intended user of the access token.
     */
    aud: string;
    /**
     * This value lets you correlate profile information from multiple Google
     * APIs. It is only present in the response if you included the profile scope
     * in your request in step 1. The field value is an immutable identifier for
     * the logged-in user that can be used to create and manage user sessions in
     * your application. The identifier is the same regardless of which client ID
     * is used to retrieve it. This enables multiple applications in the same
     * organization to correlate profile information.
     */
    user_id?: string;
    /**
     * An array of scopes that the user granted access to.
     */
    scopes: string[];
    /**
     * The datetime when the token becomes invalid.
     */
    expiry_date: number;
    /**
     * An identifier for the user, unique among all Google accounts and never
     * reused. A Google account can have multiple emails at different points in
     * time, but the sub value is never changed. Use sub within your application
     * as the unique-identifier key for the user.
     */
    sub?: string;
    /**
     * The client_id of the authorized presenter. This claim is only needed when
     * the party requesting the ID token is not the same as the audience of the ID
     * token. This may be the case at Google for hybrid apps where a web
     * application and Android app have a different client_id but share the same
     * project.
     */
    azp?: string;
    /**
     * Indicates whether your application can refresh access tokens
     * when the user is not present at the browser. Valid parameter values are
     * 'online', which is the default value, and 'offline'. Set the value to
     * 'offline' if your application needs to refresh access tokens when the user
     * is not present at the browser. This value instructs the Google
     * authorization server to return a refresh token and an access token the
     * first time that your application exchanges an authorization code for
     * tokens.
     */
    access_type?: string;
    /**
     * The user's email address. This value may not be unique to this user and
     * is not suitable for use as a primary key. Provided only if your scope
     * included the email scope value.
     */
    email?: string;
    /**
     * True if the user's e-mail address has been verified; otherwise false.
     */
    email_verified?: boolean;
}
export interface GenerateAuthUrlOpts {
    /**
     * Recommended. Indicates whether your application can refresh access tokens
     * when the user is not present at the browser. Valid parameter values are
     * 'online', which is the default value, and 'offline'. Set the value to
     * 'offline' if your application needs to refresh access tokens when the user
     * is not present at the browser. This value instructs the Google
     * authorization server to return a refresh token and an access token the
     * first time that your application exchanges an authorization code for
     * tokens.
     */
    access_type?: string;
    /**
     * The hd (hosted domain) parameter streamlines the login process for G Suite
     * hosted accounts. By including the domain of the G Suite user (for example,
     * mycollege.edu), you can indicate that the account selection UI should be
     * optimized for accounts at that domain. To optimize for G Suite accounts
     * generally instead of just one domain, use an asterisk: hd=*.
     * Don't rely on this UI optimization to control who can access your app,
     * as client-side requests can be modified. Be sure to validate that the
     * returned ID token has an hd claim value that matches what you expect
     * (e.g. mycolledge.edu). Unlike the request parameter, the ID token claim is
     * contained within a security token from Google, so the value can be trusted.
     */
    hd?: string;
    /**
     * The 'response_type' will always be set to 'CODE'.
     */
    response_type?: string;
    /**
     * The client ID for your application. The value passed into the constructor
     * will be used if not provided. You can find this value in the API Console.
     */
    client_id?: string;
    /**
     * Determines where the API server redirects the user after the user
     * completes the authorization flow. The value must exactly match one of the
     * 'redirect_uri' values listed for your project in the API Console. Note that
     * the http or https scheme, case, and trailing slash ('/') must all match.
     * The value passed into the constructor will be used if not provided.
     */
    redirect_uri?: string;
    /**
     * Required. A space-delimited list of scopes that identify the resources that
     * your application could access on the user's behalf. These values inform the
     * consent screen that Google displays to the user. Scopes enable your
     * application to only request access to the resources that it needs while
     * also enabling users to control the amount of access that they grant to your
     * application. Thus, there is an inverse relationship between the number of
     * scopes requested and the likelihood of obtaining user consent. The
     * OAuth 2.0 API Scopes document provides a full list of scopes that you might
     * use to access Google APIs. We recommend that your application request
     * access to authorization scopes in context whenever possible. By requesting
     * access to user data in context, via incremental authorization, you help
     * users to more easily understand why your application needs the access it is
     * requesting.
     */
    scope?: string[] | string;
    /**
     * Recommended. Specifies any string value that your application uses to
     * maintain state between your authorization request and the authorization
     * server's response. The server returns the exact value that you send as a
     * name=value pair in the hash (#) fragment of the 'redirect_uri' after the
     * user consents to or denies your application's access request. You can use
     * this parameter for several purposes, such as directing the user to the
     * correct resource in your application, sending nonces, and mitigating
     * cross-site request forgery. Since your redirect_uri can be guessed, using a
     * state value can increase your assurance that an incoming connection is the
     * result of an authentication request. If you generate a random string or
     * encode the hash of a cookie or another value that captures the client's
     * state, you can validate the response to additionally ensure that the
     * request and response originated in the same browser, providing protection
     * against attacks such as cross-site request forgery. See the OpenID Connect
     * documentation for an example of how to create and confirm a state token.
     */
    state?: string;
    /**
     * Optional. Enables applications to use incremental authorization to request
     * access to additional scopes in context. If you set this parameter's value
     * to true and the authorization request is granted, then the new access token
     * will also cover any scopes to which the user previously granted the
     * application access. See the incremental authorization section for examples.
     */
    include_granted_scopes?: boolean;
    /**
     * Optional. If your application knows which user is trying to authenticate,
     * it can use this parameter to provide a hint to the Google Authentication
     * Server. The server uses the hint to simplify the login flow either by
     * prefilling the email field in the sign-in form or by selecting the
     * appropriate multi-login session. Set the parameter value to an email
     * address or sub identifier, which is equivalent to the user's Google ID.
     */
    login_hint?: string;
    /**
     * Optional. A space-delimited, case-sensitive list of prompts to present the
     * user. If you don't specify this parameter, the user will be prompted only
     * the first time your app requests access.  Possible values are:
     *
     * 'none' - Donot display any authentication or consent screens. Must not be
     *        specified with other values.
     * 'consent' - 	Prompt the user for consent.
     * 'select_account' - Prompt the user to select an account.
     */
    prompt?: string;
    /**
     * Recommended. Specifies what method was used to encode a 'code_verifier'
     * that will be used during authorization code exchange. This parameter must
     * be used with the 'code_challenge' parameter. The value of the
     * 'code_challenge_method' defaults to "plain" if not present in the request
     * that includes a 'code_challenge'. The only supported values for this
     * parameter are "S256" or "plain".
     */
    code_challenge_method?: CodeChallengeMethod;
    /**
     * Recommended. Specifies an encoded 'code_verifier' that will be used as a
     * server-side challenge during authorization code exchange. This parameter
     * must be used with the 'code_challenge' parameter described above.
     */
    code_challenge?: string;
    /**
     * A way for developers and/or the auth team to provide a set of key value
     * pairs to be added as query parameters to the authorization url.
     */
    [key: string]: querystring.ParsedUrlQueryInput[keyof querystring.ParsedUrlQueryInput];
}
export interface AccessTokenResponse {
    access_token: string;
    expiry_date: number;
}
export interface GetRefreshHandlerCallback {
    (): Promise<AccessTokenResponse>;
}
export interface GetTokenCallback {
    (err: GaxiosError | null, token?: Credentials | null, res?: GaxiosResponse | null): void;
}
export interface GetTokenResponse {
    tokens: Credentials;
    res: GaxiosResponse | null;
}
export interface GetAccessTokenCallback {
    (err: GaxiosError | null, token?: string | null, res?: GaxiosResponse | null): void;
}
export interface GetAccessTokenResponse {
    token?: string | null;
    res?: GaxiosResponse | null;
}
export interface RefreshAccessTokenCallback {
    (err: GaxiosError | null, credentials?: Credentials | null, res?: GaxiosResponse | null): void;
}
export interface RefreshAccessTokenResponse {
    credentials: Credentials;
    res: GaxiosResponse | null;
}
export interface RequestMetadataResponse {
    headers: Headers;
    res?: GaxiosResponse<void> | null;
}
export interface RequestMetadataCallback {
    (err: GaxiosError | null, headers?: Headers, res?: GaxiosResponse<void> | null): void;
}
export interface GetFederatedSignonCertsCallback {
    (err: GaxiosError | null, certs?: Certificates, response?: GaxiosResponse<void> | null): void;
}
export interface FederatedSignonCertsResponse {
    certs: Certificates;
    format: CertificateFormat;
    res?: GaxiosResponse<void> | null;
}
export interface GetIapPublicKeysCallback {
    (err: GaxiosError | null, pubkeys?: PublicKeys, response?: GaxiosResponse<void> | null): void;
}
export interface IapPublicKeysResponse {
    pubkeys: PublicKeys;
    res?: GaxiosResponse<void> | null;
}
export interface RevokeCredentialsResult {
    success: boolean;
}
export interface VerifyIdTokenOptions {
    idToken: string;
    audience?: string | string[];
    maxExpiry?: number;
}
export interface OAuth2ClientEndpoints {
    /**
     * The endpoint for viewing access token information
     *
     * @example
     * 'https://oauth2.googleapis.com/tokeninfo'
     */
    tokenInfoUrl: string | URL;
    /**
     * The base URL for auth endpoints.
     *
     * @example
     * 'https://accounts.google.com/o/oauth2/v2/auth'
     */
    oauth2AuthBaseUrl: string | URL;
    /**
     * The base endpoint for token retrieval
     * .
     * @example
     * 'https://oauth2.googleapis.com/token'
     */
    oauth2TokenUrl: string | URL;
    /**
     * The base endpoint to revoke tokens.
     *
     * @example
     * 'https://oauth2.googleapis.com/revoke'
     */
    oauth2RevokeUrl: string | URL;
    /**
     * Sign on certificates in PEM format.
     *
     * @example
     * 'https://www.googleapis.com/oauth2/v1/certs'
     */
    oauth2FederatedSignonPemCertsUrl: string | URL;
    /**
     * Sign on certificates in JWK format.
     *
     * @example
     * 'https://www.googleapis.com/oauth2/v3/certs'
     */
    oauth2FederatedSignonJwkCertsUrl: string | URL;
    /**
     * IAP Public Key URL.
     * This URL contains a JSON dictionary that maps the `kid` claims to the public key values.
     *
     * @example
     * 'https://www.gstatic.com/iap/verify/public_key'
     */
    oauth2IapPublicKeyUrl: string | URL;
}
export interface OAuth2ClientOptions extends AuthClientOptions {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    /**
     * Customizable endpoints.
     */
    endpoints?: Partial<OAuth2ClientEndpoints>;
    /**
     * The allowed OAuth2 token issuers.
     */
    issuers?: string[];
    /**
     * The client authentication type. Supported values are basic, post, and none.
     * Defaults to post if not provided.
     * https://datatracker.ietf.org/doc/html/rfc7591#section-2
     */
    clientAuthentication?: ClientAuthentication;
}
export type RefreshOptions = Pick<AuthClientOptions, 'eagerRefreshThresholdMillis' | 'forceRefreshOnFailure'>;
export declare class OAuth2Client extends AuthClient {
    private redirectUri?;
    private certificateCache;
    private certificateExpiry;
    private certificateCacheFormat;
    protected refreshTokenPromises: Map<string, Promise<GetTokenResponse>>;
    readonly endpoints: Readonly<OAuth2ClientEndpoints>;
    readonly issuers: string[];
    readonly clientAuthentication: ClientAuthentication;
    _clientId?: string;
    _clientSecret?: string;
    refreshHandler?: GetRefreshHandlerCallback;
    /**
     * Handles OAuth2 flow for Google APIs.
     *
     * @param clientId The authentication client ID.
     * @param clientSecret The authentication client secret.
     * @param redirectUri The URI to redirect to after completing the auth
     * request.
     * @param opts optional options for overriding the given parameters.
     * @constructor
     */
    constructor(options?: OAuth2ClientOptions);
    constructor(clientId?: string, clientSecret?: string, redirectUri?: string);
    /**
     * @deprecated use instance's {@link OAuth2Client.endpoints}
     */
    protected static readonly GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
    /**
     * Clock skew - five minutes in seconds
     */
    private static readonly CLOCK_SKEW_SECS_;
    /**
     * The default max Token Lifetime is one day in seconds
     */
    private static readonly DEFAULT_MAX_TOKEN_LIFETIME_SECS_;
    /**
     * Generates URL for consent page landing.
     * @param opts Options.
     * @return URL to consent page.
     */
    generateAuthUrl(opts?: GenerateAuthUrlOpts): string;
    generateCodeVerifier(): void;
    /**
     * Convenience method to automatically generate a code_verifier, and its
     * resulting SHA256. If used, this must be paired with a S256
     * code_challenge_method.
     *
     * For a full example see:
     * https://github.com/googleapis/google-auth-library-nodejs/blob/main/samples/oauth2-codeVerifier.js
     */
    generateCodeVerifierAsync(): Promise<CodeVerifierResults>;
    /**
     * Gets the access token for the given code.
     * @param code The authorization code.
     * @param callback Optional callback fn.
     */
    getToken(code: string): Promise<GetTokenResponse>;
    getToken(options: GetTokenOptions): Promise<GetTokenResponse>;
    getToken(code: string, callback: GetTokenCallback): void;
    getToken(options: GetTokenOptions, callback: GetTokenCallback): void;
    private getTokenAsync;
    /**
     * Refreshes the access token.
     * @param refresh_token Existing refresh token.
     * @private
     */
    protected refreshToken(refreshToken?: string | null): Promise<GetTokenResponse>;
    protected refreshTokenNoCache(refreshToken?: string | null): Promise<GetTokenResponse>;
    /**
     * Retrieves the access token using refresh token
     *
     * @param callback callback
     */
    refreshAccessToken(): Promise<RefreshAccessTokenResponse>;
    refreshAccessToken(callback: RefreshAccessTokenCallback): void;
    private refreshAccessTokenAsync;
    /**
     * Get a non-expired access token, after refreshing if necessary
     *
     * @param callback Callback to call with the access token
     */
    getAccessToken(): Promise<GetAccessTokenResponse>;
    getAccessToken(callback: GetAccessTokenCallback): void;
    private getAccessTokenAsync;
    /**
     * The main authentication interface.  It takes an optional url which when
     * present is the endpoint being accessed, and returns a Promise which
     * resolves with authorization header fields.
     *
     * In OAuth2Client, the result has the form:
     * { Authorization: 'Bearer <access_token_value>' }
     * @param url The optional url being authorized
     */
    getRequestHeaders(url?: string): Promise<Headers>;
    protected getRequestMetadataAsync(url?: string | URL | null): Promise<RequestMetadataResponse>;
    /**
     * Generates an URL to revoke the given token.
     * @param token The existing token to be revoked.
     *
     * @deprecated use instance method {@link OAuth2Client.getRevokeTokenURL}
     */
    static getRevokeTokenUrl(token: string): string;
    /**
     * Generates a URL to revoke the given token.
     *
     * @param token The existing token to be revoked.
     */
    getRevokeTokenURL(token: string): URL;
    /**
     * Revokes the access given to token.
     * @param token The existing token to be revoked.
     * @param callback Optional callback fn.
     */
    revokeToken(token: string): GaxiosPromise<RevokeCredentialsResult>;
    revokeToken(token: string, callback: BodyResponseCallback<RevokeCredentialsResult>): void;
    /**
     * Revokes access token and clears the credentials object
     * @param callback callback
     */
    revokeCredentials(): GaxiosPromise<RevokeCredentialsResult>;
    revokeCredentials(callback: BodyResponseCallback<RevokeCredentialsResult>): void;
    private revokeCredentialsAsync;
    /**
     * Provides a request implementation with OAuth 2.0 flow. If credentials have
     * a refresh_token, in cases of HTTP 401 and 403 responses, it automatically
     * asks for a new access token and replays the unsuccessful request.
     * @param opts Request options.
     * @param callback callback.
     * @return Request object
     */
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    request<T>(opts: GaxiosOptions, callback: BodyResponseCallback<T>): void;
    protected requestAsync<T>(opts: GaxiosOptions, reAuthRetried?: boolean): Promise<GaxiosResponse<T>>;
    /**
     * Verify id token is token by checking the certs and audience
     * @param options that contains all options.
     * @param callback Callback supplying GoogleLogin if successful
     */
    verifyIdToken(options: VerifyIdTokenOptions): Promise<LoginTicket>;
    verifyIdToken(options: VerifyIdTokenOptions, callback: (err: Error | null, login?: LoginTicket) => void): void;
    private verifyIdTokenAsync;
    /**
     * Obtains information about the provisioned access token.  Especially useful
     * if you want to check the scopes that were provisioned to a given token.
     *
     * @param accessToken Required.  The Access Token for which you want to get
     * user info.
     */
    getTokenInfo(accessToken: string): Promise<TokenInfo>;
    /**
     * Gets federated sign-on certificates to use for verifying identity tokens.
     * Returns certs as array structure, where keys are key ids, and values
     * are certificates in either PEM or JWK format.
     * @param callback Callback supplying the certificates
     */
    getFederatedSignonCerts(): Promise<FederatedSignonCertsResponse>;
    getFederatedSignonCerts(callback: GetFederatedSignonCertsCallback): void;
    getFederatedSignonCertsAsync(): Promise<FederatedSignonCertsResponse>;
    /**
     * Gets federated sign-on certificates to use for verifying identity tokens.
     * Returns certs as array structure, where keys are key ids, and values
     * are certificates in either PEM or JWK format.
     * @param callback Callback supplying the certificates
     */
    getIapPublicKeys(): Promise<IapPublicKeysResponse>;
    getIapPublicKeys(callback: GetIapPublicKeysCallback): void;
    getIapPublicKeysAsync(): Promise<IapPublicKeysResponse>;
    verifySignedJwtWithCerts(): void;
    /**
     * Verify the id token is signed with the correct certificate
     * and is from the correct audience.
     * @param jwt The jwt to verify (The ID Token in this case).
     * @param certs The array of certs to test the jwt against.
     * @param requiredAudience The audience to test the jwt against.
     * @param issuers The allowed issuers of the jwt (Optional).
     * @param maxExpiry The max expiry the certificate can be (Optional).
     * @return Returns a promise resolving to LoginTicket on verification.
     */
    verifySignedJwtWithCertsAsync(jwt: string, certs: Certificates | PublicKeys, requiredAudience?: string | string[], issuers?: string[], maxExpiry?: number): Promise<LoginTicket>;
    /**
     * Returns a promise that resolves with AccessTokenResponse type if
     * refreshHandler is defined.
     * If not, nothing is returned.
     */
    private processAndValidateRefreshHandler;
    /**
     * Returns true if a token is expired or will expire within
     * eagerRefreshThresholdMillismilliseconds.
     * If there is no expiry time, assumes the token is not expired or expiring.
     */
    protected isTokenExpiring(): boolean;
}
