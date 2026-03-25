import { Gaxios, GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
import { Credentials } from './credentials';
import { AuthClient, AuthClientOptions, GetAccessTokenResponse, BodyResponseCallback } from './authclient';
import { SnakeToCamelObject } from '../util';
/**
 * Offset to take into account network delays and server clock skews.
 */
export declare const EXPIRATION_TIME_OFFSET: number;
/**
 * The credentials JSON file type for external account clients.
 * There are 3 types of JSON configs:
 * 1. authorized_user => Google end user credential
 * 2. service_account => Google service account credential
 * 3. external_Account => non-GCP service (eg. AWS, Azure, K8s)
 */
export declare const EXTERNAL_ACCOUNT_TYPE = "external_account";
/**
 * Cloud resource manager URL used to retrieve project information.
 *
 * @deprecated use {@link BaseExternalAccountClient.cloudResourceManagerURL} instead
 **/
export declare const CLOUD_RESOURCE_MANAGER = "https://cloudresourcemanager.googleapis.com/v1/projects/";
/**
 * Shared options used to build {@link ExternalAccountClient} and
 * {@link ExternalAccountAuthorizedUserClient}.
 */
export interface SharedExternalAccountClientOptions extends AuthClientOptions {
    /**
     *  The Security Token Service audience, which is usually the fully specified
     *  resource name of the workload or workforce pool provider.
     */
    audience: string;
    /**
     * The Security Token Service token URL used to exchange the third party token
     * for a GCP access token. If not provided, will default to
     * 'https://sts.googleapis.com/v1/token'
     */
    token_url?: string;
}
/**
 * Interface containing context about the requested external identity. This is
 * passed on all requests from external account clients to external identity suppliers.
 */
export interface ExternalAccountSupplierContext {
    /**
     * The requested external account audience. For example:
     * * "//iam.googleapis.com/locations/global/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID"
     * * "//iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID"
     */
    audience: string;
    /**
     * The requested subject token type. Expected values include:
     * * "urn:ietf:params:oauth:token-type:jwt"
     * * "urn:ietf:params:aws:token-type:aws4_request"
     * * "urn:ietf:params:oauth:token-type:saml2"
     * * "urn:ietf:params:oauth:token-type:id_token"
     */
    subjectTokenType: string;
    /**
     * The {@link Gaxios} instance for calling external account
     * to use for requests.
     */
    transporter: Gaxios;
}
/**
 * Base external account credentials json interface.
 */
export interface BaseExternalAccountClientOptions extends SharedExternalAccountClientOptions {
    /**
     * Credential type, should always be 'external_account'.
     */
    type?: string;
    /**
     * The Security Token Service subject token type based on the OAuth 2.0
     * token exchange spec. Expected values include:
     * * 'urn:ietf:params:oauth:token-type:jwt'
     * * 'urn:ietf:params:aws:token-type:aws4_request'
     * * 'urn:ietf:params:oauth:token-type:saml2'
     * * 'urn:ietf:params:oauth:token-type:id_token'
     */
    subject_token_type: string;
    /**
     * The URL for the service account impersonation request. This URL is required
     * for some APIs. If this URL is not available, the access token from the
     * Security Token Service is used directly.
     */
    service_account_impersonation_url?: string;
    /**
     * Object containing additional options for service account impersonation.
     */
    service_account_impersonation?: {
        /**
         * The desired lifetime of the impersonated service account access token.
         * If not provided, the default lifetime will be 3600 seconds.
         */
        token_lifetime_seconds?: number;
    };
    /**
     * The endpoint used to retrieve account related information.
     */
    token_info_url?: string;
    /**
     * Client ID of the service account from the console.
     */
    client_id?: string;
    /**
     * Client secret of the service account from the console.
     */
    client_secret?: string;
    /**
     * The workforce pool user project. Required when using a workforce identity
     * pool.
     */
    workforce_pool_user_project?: string;
    /**
     * The scopes to request during the authorization grant.
     */
    scopes?: string[];
    /**
     * @example
     * https://cloudresourcemanager.googleapis.com/v1/projects/
     **/
    cloud_resource_manager_url?: string | URL;
}
/**
 * Interface defining the successful response for iamcredentials
 * generateAccessToken API.
 * https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken
 */
export interface IamGenerateAccessTokenResponse {
    accessToken: string;
    /**
     * ISO format used for expiration time.
     *
     * @example
     * '2014-10-02T15:01:23.045123456Z'
     */
    expireTime: string;
}
/**
 * Interface defining the project information response returned by the cloud
 * resource manager.
 * https://cloud.google.com/resource-manager/reference/rest/v1/projects#Project
 */
export interface ProjectInfo {
    projectNumber: string;
    projectId: string;
    lifecycleState: string;
    name: string;
    createTime?: string;
    parent: {
        [key: string]: ReturnType<JSON['parse']>;
    };
}
/**
 * Internal interface for tracking the access token expiration time.
 */
interface CredentialsWithResponse extends Credentials {
    res?: GaxiosResponse | null;
}
/**
 * Base external account client. This is used to instantiate AuthClients for
 * exchanging external account credentials for GCP access token and authorizing
 * requests to GCP APIs.
 * The base class implements common logic for exchanging various type of
 * external credentials for GCP access token. The logic of determining and
 * retrieving the external credential based on the environment and
 * credential_source will be left for the subclasses.
 */
export declare abstract class BaseExternalAccountClient extends AuthClient {
    #private;
    /**
     * OAuth scopes for the GCP access token to use. When not provided,
     * the default https://www.googleapis.com/auth/cloud-platform is
     * used.
     */
    scopes?: string | string[];
    private cachedAccessToken;
    protected readonly audience: string;
    protected readonly subjectTokenType: string;
    private readonly serviceAccountImpersonationUrl?;
    private readonly serviceAccountImpersonationLifetime?;
    private readonly stsCredential;
    private readonly clientAuth?;
    private readonly workforcePoolUserProject?;
    projectNumber: string | null;
    private readonly configLifetimeRequested;
    protected credentialSourceType?: string;
    /**
     * @example
     * ```ts
     * new URL('https://cloudresourcemanager.googleapis.com/v1/projects/');
     * ```
     */
    protected cloudResourceManagerURL: URL | string;
    protected supplierContext: ExternalAccountSupplierContext;
    /**
     * Instantiate a BaseExternalAccountClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file. The camelCased options
     *   are aliases for the snake_cased options.
     */
    constructor(options: BaseExternalAccountClientOptions | SnakeToCamelObject<BaseExternalAccountClientOptions>);
    /** The service account email to be impersonated, if available. */
    getServiceAccountEmail(): string | null;
    /**
     * Provides a mechanism to inject GCP access tokens directly.
     * When the provided credential expires, a new credential, using the
     * external account options, is retrieved.
     * @param credentials The Credentials object to set on the current client.
     */
    setCredentials(credentials: Credentials): void;
    /**
     * Triggered when a external subject token is needed to be exchanged for a GCP
     * access token via GCP STS endpoint.
     * This abstract method needs to be implemented by subclasses depending on
     * the type of external credential used.
     * @return A promise that resolves with the external subject token.
     */
    abstract retrieveSubjectToken(): Promise<string>;
    /**
     * @return A promise that resolves with the current GCP access token
     *   response. If the current credential is expired, a new one is retrieved.
     */
    getAccessToken(): Promise<GetAccessTokenResponse>;
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
     * @return A promise that resolves with the HTTP response when no callback is
     *   provided.
     */
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    request<T>(opts: GaxiosOptions, callback: BodyResponseCallback<T>): void;
    /**
     * @return A promise that resolves with the project ID corresponding to the
     *   current workload identity pool or current workforce pool if
     *   determinable. For workforce pool credential, it returns the project ID
     *   corresponding to the workforcePoolUserProject.
     *   This is introduced to match the current pattern of using the Auth
     *   library:
     *   const projectId = await auth.getProjectId();
     *   const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
     *   const res = await client.request({ url });
     *   The resource may not have permission
     *   (resourcemanager.projects.get) to call this API or the required
     *   scopes may not be selected:
     *   https://cloud.google.com/resource-manager/reference/rest/v1/projects/get#authorization-scopes
     */
    getProjectId(): Promise<string | null>;
    /**
     * Authenticates the provided HTTP request, processes it and resolves with the
     * returned response.
     * @param opts The HTTP request options.
     * @param reAuthRetried Whether the current attempt is a retry after a failed attempt due to an auth failure.
     * @return A promise that resolves with the successful response.
     */
    protected requestAsync<T>(opts: GaxiosOptions, reAuthRetried?: boolean): Promise<GaxiosResponse<T>>;
    /**
     * Forces token refresh, even if unexpired tokens are currently cached.
     * External credentials are exchanged for GCP access tokens via the token
     * exchange endpoint and other settings provided in the client options
     * object.
     * If the service_account_impersonation_url is provided, an additional
     * step to exchange the external account GCP access token for a service
     * account impersonated token is performed.
     * @return A promise that resolves with the fresh GCP access tokens.
     */
    protected refreshAccessTokenAsync(): Promise<CredentialsWithResponse>;
    /**
     * Returns the workload identity pool project number if it is determinable
     * from the audience resource name.
     * @param audience The STS audience used to determine the project number.
     * @return The project number associated with the workload identity pool, if
     *   this can be determined from the STS audience field. Otherwise, null is
     *   returned.
     */
    private getProjectNumber;
    /**
     * Exchanges an external account GCP access token for a service
     * account impersonated access token using iamcredentials
     * GenerateAccessToken API.
     * @param token The access token to exchange for a service account access
     *   token.
     * @return A promise that resolves with the service account impersonated
     *   credentials response.
     */
    private getImpersonatedAccessToken;
    /**
     * Returns whether the provided credentials are expired or not.
     * If there is no expiry time, assumes the token is not expired or expiring.
     * @param accessToken The credentials to check for expiration.
     * @return Whether the credentials are expired or not.
     */
    private isExpired;
    /**
     * @return The list of scopes for the requested GCP access token.
     */
    private getScopesArray;
    private getMetricsHeaderValue;
}
export {};
