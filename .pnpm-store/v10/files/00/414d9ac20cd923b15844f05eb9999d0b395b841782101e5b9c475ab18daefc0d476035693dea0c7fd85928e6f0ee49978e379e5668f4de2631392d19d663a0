import { GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
import { Credentials } from './credentials';
import { AuthClient, AuthClientOptions, GetAccessTokenResponse, BodyResponseCallback } from './authclient';
/**
 * The maximum number of access boundary rules a Credential Access Boundary
 * can contain.
 */
export declare const MAX_ACCESS_BOUNDARY_RULES_COUNT = 10;
/**
 * Offset to take into account network delays and server clock skews.
 */
export declare const EXPIRATION_TIME_OFFSET: number;
/**
 * Internal interface for tracking the access token expiration time.
 */
interface CredentialsWithResponse extends Credentials {
    res?: GaxiosResponse | null;
}
/**
 * Internal interface for tracking and returning the Downscoped access token
 * expiration time in epoch time (seconds).
 */
interface DownscopedAccessTokenResponse extends GetAccessTokenResponse {
    expirationTime?: number | null;
}
/**
 * Defines an upper bound of permissions available for a GCP credential.
 */
export interface CredentialAccessBoundary {
    accessBoundary: {
        accessBoundaryRules: AccessBoundaryRule[];
    };
}
/** Defines an upper bound of permissions on a particular resource. */
interface AccessBoundaryRule {
    availablePermissions: string[];
    availableResource: string;
    availabilityCondition?: AvailabilityCondition;
}
/**
 * An optional condition that can be used as part of a
 * CredentialAccessBoundary to further restrict permissions.
 */
interface AvailabilityCondition {
    expression: string;
    title?: string;
    description?: string;
}
export interface DownscopedClientOptions extends AuthClientOptions {
    /**
     * The source AuthClient to be downscoped based on the provided Credential Access Boundary rules.
     */
    authClient: AuthClient;
    /**
     * The Credential Access Boundary which contains a list of access boundary rules.
     * Each rule contains information on the resource that the rule applies to, the upper bound of the
     * permissions that are available on that resource and an optional
     * condition to further restrict permissions.
     */
    credentialAccessBoundary: CredentialAccessBoundary;
}
/**
 * Defines a set of Google credentials that are downscoped from an existing set
 * of Google OAuth2 credentials. This is useful to restrict the Identity and
 * Access Management (IAM) permissions that a short-lived credential can use.
 * The common pattern of usage is to have a token broker with elevated access
 * generate these downscoped credentials from higher access source credentials
 * and pass the downscoped short-lived access tokens to a token consumer via
 * some secure authenticated channel for limited access to Google Cloud Storage
 * resources.
 */
export declare class DownscopedClient extends AuthClient {
    private readonly authClient;
    private readonly credentialAccessBoundary;
    private cachedDownscopedAccessToken;
    private readonly stsCredential;
    /**
     * Instantiates a downscoped client object using the provided source
     * AuthClient and credential access boundary rules.
     * To downscope permissions of a source AuthClient, a Credential Access
     * Boundary that specifies which resources the new credential can access, as
     * well as an upper bound on the permissions that are available on each
     * resource, has to be defined. A downscoped client can then be instantiated
     * using the source AuthClient and the Credential Access Boundary.
     * @param options the {@link DownscopedClientOptions `DownscopedClientOptions`} to use. Passing an `AuthClient` directly is **@DEPRECATED**.
     * @param credentialAccessBoundary **@DEPRECATED**. Provide a {@link DownscopedClientOptions `DownscopedClientOptions`} object in the first parameter instead.
     */
    constructor(
    /**
     * AuthClient is for backwards-compatibility.
     */
    options: AuthClient | DownscopedClientOptions, 
    /**
     * @deprecated - provide a {@link DownscopedClientOptions `DownscopedClientOptions`} object in the first parameter instead
     */
    credentialAccessBoundary?: CredentialAccessBoundary);
    /**
     * Provides a mechanism to inject Downscoped access tokens directly.
     * The expiry_date field is required to facilitate determination of the token
     * expiration which would make it easier for the token consumer to handle.
     * @param credentials The Credentials object to set on the current client.
     */
    setCredentials(credentials: Credentials): void;
    getAccessToken(): Promise<DownscopedAccessTokenResponse>;
    /**
     * The main authentication interface. It takes an optional url which when
     * present is the endpoint being accessed, and returns a Promise which
     * resolves with authorization header fields.
     *
     * The result has the form:
     * { authorization: 'Bearer <access_token_value>' }
     */
    getRequestHeaders(): Promise<Headers>;
    /**
     * Provides a request implementation with OAuth 2.0 flow. In cases of
     * HTTP 401 and 403 responses, it automatically asks for a new access token
     * and replays the unsuccessful request.
     * @param opts Request options.
     * @param callback callback.
     * @return A promise that resolves with the HTTP response when no callback
     *   is provided.
     */
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    request<T>(opts: GaxiosOptions, callback: BodyResponseCallback<T>): void;
    /**
     * Authenticates the provided HTTP request, processes it and resolves with the
     * returned response.
     * @param opts The HTTP request options.
     * @param reAuthRetried Whether the current attempt is a retry after a failed attempt due to an auth failure
     * @return A promise that resolves with the successful response.
     */
    protected requestAsync<T>(opts: GaxiosOptions, reAuthRetried?: boolean): Promise<GaxiosResponse<T>>;
    /**
     * Forces token refresh, even if unexpired tokens are currently cached.
     * GCP access tokens are retrieved from authclient object/source credential.
     * Then GCP access tokens are exchanged for downscoped access tokens via the
     * token exchange endpoint.
     * @return A promise that resolves with the fresh downscoped access token.
     */
    protected refreshAccessTokenAsync(): Promise<CredentialsWithResponse>;
    /**
     * Returns whether the provided credentials are expired or not.
     * If there is no expiry time, assumes the token is not expired or expiring.
     * @param downscopedAccessToken The credentials to check for expiration.
     * @return Whether the credentials are expired or not.
     */
    private isExpired;
}
export {};
