import { GaxiosOptions, GaxiosResponse } from 'gaxios';
import * as stream from 'stream';
import { CredentialBody, ImpersonatedJWTInput, JWTInput } from './credentials';
import { IdTokenClient } from './idtokenclient';
import { GCPEnv } from './envDetect';
import { JWT } from './jwtclient';
import { UserRefreshClient } from './refreshclient';
import { Impersonated } from './impersonated';
import { ExternalAccountClientOptions } from './externalclient';
import { BaseExternalAccountClient } from './baseexternalclient';
import { AuthClient, AuthClientOptions } from './authclient';
import { ExternalAccountAuthorizedUserClient } from './externalAccountAuthorizedUserClient';
import { AnyAuthClient, AnyAuthClientConstructor } from '..';
/**
 * Defines all types of explicit clients that are determined via ADC JSON
 * config file.
 */
export type JSONClient = JWT | UserRefreshClient | BaseExternalAccountClient | ExternalAccountAuthorizedUserClient | Impersonated;
export interface ProjectIdCallback {
    (err?: Error | null, projectId?: string | null): void;
}
export interface CredentialCallback {
    (err: Error | null, result?: JSONClient): void;
}
export interface ADCCallback {
    (err: Error | null, credential?: AuthClient, projectId?: string | null): void;
}
export interface ADCResponse {
    credential: AuthClient;
    projectId: string | null;
}
export interface GoogleAuthOptions<T extends AuthClient = AnyAuthClient> {
    /**
     * An API key to use, optional. Cannot be used with {@link GoogleAuthOptions.credentials `credentials`}.
     */
    apiKey?: string;
    /**
     * An `AuthClient` to use
     */
    authClient?: T;
    /**
     * Path to a .json, .pem, or .p12 key file
     */
    keyFilename?: string;
    /**
     * Path to a .json, .pem, or .p12 key file
     */
    keyFile?: string;
    /**
     * Object containing client_email and private_key properties, or the
     * external account client options.
     * Cannot be used with {@link GoogleAuthOptions.apiKey `apiKey`}.
     *
     * @remarks
     *
     * **Important**: If you accept a credential configuration (credential JSON/File/Stream) from an external source for authentication to Google Cloud, you must validate it before providing it to any Google API or library. Providing an unvalidated credential configuration to Google APIs can compromise the security of your systems and data. For more information, refer to {@link https://cloud.google.com/docs/authentication/external/externally-sourced-credentials Validate credential configurations from external sources}.
     */
    credentials?: JWTInput | ExternalAccountClientOptions;
    /**
     * `AuthClientOptions` object passed to the constructor of the client
     */
    clientOptions?: Extract<ConstructorParameters<AnyAuthClientConstructor>[0], AuthClientOptions>;
    /**
     * Required scopes for the desired API request
     */
    scopes?: string | string[];
    /**
     * Your project ID.
     */
    projectId?: string;
    /**
     * The default service domain for a given Cloud universe.
     *
     * This is an ergonomic equivalent to {@link clientOptions}'s `universeDomain`
     * property and will be set for all generated {@link AuthClient}s.
     */
    universeDomain?: string;
}
export declare const GoogleAuthExceptionMessages: {
    readonly API_KEY_WITH_CREDENTIALS: "API Keys and Credentials are mutually exclusive authentication methods and cannot be used together.";
    readonly NO_PROJECT_ID_FOUND: string;
    readonly NO_CREDENTIALS_FOUND: string;
    readonly NO_ADC_FOUND: "Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.";
    readonly NO_UNIVERSE_DOMAIN_FOUND: string;
};
export declare class GoogleAuth<T extends AuthClient = AuthClient> {
    #private;
    /**
     * Caches a value indicating whether the auth layer is running on Google
     * Compute Engine.
     * @private
     */
    private checkIsGCE?;
    useJWTAccessWithScope?: boolean;
    defaultServicePath?: string;
    get isGCE(): boolean | undefined;
    private _findProjectIdPromise?;
    private _cachedProjectId?;
    jsonContent: JWTInput | ExternalAccountClientOptions | null;
    apiKey: string | null;
    cachedCredential: AnyAuthClient | T | null;
    /**
     * Scopes populated by the client library by default. We differentiate between
     * these and user defined scopes when deciding whether to use a self-signed JWT.
     */
    defaultScopes?: string | string[];
    private keyFilename?;
    private scopes?;
    private clientOptions;
    /**
     * Configuration is resolved in the following order of precedence:
     * - {@link GoogleAuthOptions.credentials `credentials`}
     * - {@link GoogleAuthOptions.keyFilename `keyFilename`}
     * - {@link GoogleAuthOptions.keyFile `keyFile`}
     *
     * {@link GoogleAuthOptions.clientOptions `clientOptions`} are passed to the
     * {@link AuthClient `AuthClient`s}.
     *
     * @param opts
     */
    constructor(opts?: GoogleAuthOptions<T>);
    setGapicJWTValues(client: JWT): void;
    /**
     * Obtains the default project ID for the application.
     *
     * Retrieves in the following order of precedence:
     * - The `projectId` provided in this object's construction
     * - GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT environment variable
     * - GOOGLE_APPLICATION_CREDENTIALS JSON file
     * - Cloud SDK: `gcloud config config-helper --format json`
     * - GCE project ID from metadata server
     */
    getProjectId(): Promise<string>;
    getProjectId(callback: ProjectIdCallback): void;
    /**
     * A temporary method for internal `getProjectId` usages where `null` is
     * acceptable. In a future major release, `getProjectId` should return `null`
     * (as the `Promise<string | null>` base signature describes) and this private
     * method should be removed.
     *
     * @returns Promise that resolves with project id (or `null`)
     */
    private getProjectIdOptional;
    /**
     * A private method for finding and caching a projectId.
     *
     * Supports environments in order of precedence:
     * - GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT environment variable
     * - GOOGLE_APPLICATION_CREDENTIALS JSON file
     * - Cloud SDK: `gcloud config config-helper --format json`
     * - GCE project ID from metadata server
     *
     * @returns projectId
     */
    private findAndCacheProjectId;
    private getProjectIdAsync;
    /**
     * Retrieves a universe domain from the metadata server via
     * {@link gcpMetadata.universe}.
     *
     * @returns a universe domain
     */
    getUniverseDomainFromMetadataServer(): Promise<string>;
    /**
     * Retrieves, caches, and returns the universe domain in the following order
     * of precedence:
     * - The universe domain in {@link GoogleAuth.clientOptions}
     * - An existing or ADC {@link AuthClient}'s universe domain
     * - {@link gcpMetadata.universe}, if {@link Compute} client
     *
     * @returns The universe domain
     */
    getUniverseDomain(): Promise<string>;
    /**
     * @returns Any scopes (user-specified or default scopes specified by the
     *   client library) that need to be set on the current Auth client.
     */
    private getAnyScopes;
    /**
     * Obtains the default service-level credentials for the application.
     * @param callback Optional callback.
     * @returns Promise that resolves with the ADCResponse (if no callback was
     * passed).
     */
    getApplicationDefault(): Promise<ADCResponse>;
    getApplicationDefault(callback: ADCCallback): void;
    getApplicationDefault(options: AuthClientOptions): Promise<ADCResponse>;
    getApplicationDefault(options: AuthClientOptions, callback: ADCCallback): void;
    private getApplicationDefaultAsync;
    /**
     * Determines whether the auth layer is running on Google Compute Engine.
     * Checks for GCP Residency, then fallback to checking if metadata server
     * is available.
     *
     * @returns A promise that resolves with the boolean.
     * @api private
     */
    _checkIsGCE(): Promise<boolean>;
    /**
     * Attempts to load default credentials from the environment variable path..
     * @returns Promise that resolves with the OAuth2Client or null.
     * @api private
     */
    _tryGetApplicationCredentialsFromEnvironmentVariable(options?: AuthClientOptions): Promise<JSONClient | null>;
    /**
     * Attempts to load default credentials from a well-known file location
     * @return Promise that resolves with the OAuth2Client or null.
     * @api private
     */
    _tryGetApplicationCredentialsFromWellKnownFile(options?: AuthClientOptions): Promise<JSONClient | null>;
    /**
     * Attempts to load default credentials from a file at the given path..
     * @param filePath The path to the file to read.
     * @returns Promise that resolves with the OAuth2Client
     * @api private
     */
    _getApplicationCredentialsFromFilePath(filePath: string, options?: AuthClientOptions): Promise<JSONClient>;
    /**
     * Create a credentials instance using a given impersonated input options.
     * @param json The impersonated input object.
     * @returns JWT or UserRefresh Client with data
     */
    fromImpersonatedJSON(json: ImpersonatedJWTInput): Impersonated;
    /**
     * Create a credentials instance using the given input options.
     * This client is not cached.
     *
     * **Important**: If you accept a credential configuration (credential JSON/File/Stream) from an external source for authentication to Google Cloud, you must validate it before providing it to any Google API or library. Providing an unvalidated credential configuration to Google APIs can compromise the security of your systems and data. For more information, refer to {@link https://cloud.google.com/docs/authentication/external/externally-sourced-credentials Validate credential configurations from external sources}.
     *
     * @param json The input object.
     * @param options The JWT or UserRefresh options for the client
     * @returns JWT or UserRefresh Client with data
     */
    fromJSON(json: JWTInput | ImpersonatedJWTInput, options?: AuthClientOptions): JSONClient;
    /**
     * Return a JWT or UserRefreshClient from JavaScript object, caching both the
     * object used to instantiate and the client.
     * @param json The input object.
     * @param options The JWT or UserRefresh options for the client
     * @returns JWT or UserRefresh Client with data
     */
    private _cacheClientFromJSON;
    /**
     * Create a credentials instance using the given input stream.
     * @param inputStream The input stream.
     * @param callback Optional callback.
     */
    fromStream(inputStream: stream.Readable): Promise<JSONClient>;
    fromStream(inputStream: stream.Readable, callback: CredentialCallback): void;
    fromStream(inputStream: stream.Readable, options: AuthClientOptions): Promise<JSONClient>;
    fromStream(inputStream: stream.Readable, options: AuthClientOptions, callback: CredentialCallback): void;
    private fromStreamAsync;
    /**
     * Create a credentials instance using the given API key string.
     * The created client is not cached. In order to create and cache it use the {@link GoogleAuth.getClient `getClient`} method after first providing an {@link GoogleAuth.apiKey `apiKey`}.
     *
     * @param apiKey The API key string
     * @param options An optional options object.
     * @returns A JWT loaded from the key
     */
    fromAPIKey(apiKey: string, options?: AuthClientOptions): JWT;
    /**
     * Determines whether the current operating system is Windows.
     * @api private
     */
    private _isWindows;
    /**
     * Run the Google Cloud SDK command that prints the default project ID
     */
    private getDefaultServiceProjectId;
    /**
     * Loads the project id from environment variables.
     * @api private
     */
    private getProductionProjectId;
    /**
     * Loads the project id from the GOOGLE_APPLICATION_CREDENTIALS json file.
     * @api private
     */
    private getFileProjectId;
    /**
     * Gets the project ID from external account client if available.
     */
    private getExternalAccountClientProjectId;
    /**
     * Gets the Compute Engine project ID if it can be inferred.
     */
    private getGCEProjectId;
    /**
     * The callback function handles a credential object that contains the
     * client_email and private_key (if exists).
     * getCredentials first checks if the client is using an external account and
     * uses the service account email in place of client_email.
     * If that doesn't exist, it checks for these values from the user JSON.
     * If the user JSON doesn't exist, and the environment is on GCE, it gets the
     * client_email from the cloud metadata server.
     * @param callback Callback that handles the credential object that contains
     * a client_email and optional private key, or the error.
     * returned
     */
    getCredentials(): Promise<CredentialBody>;
    getCredentials(callback: (err: Error | null, credentials?: CredentialBody) => void): void;
    private getCredentialsAsync;
    /**
     * Automatically obtain an {@link AuthClient `AuthClient`} based on the
     * provided configuration. If no options were passed, use Application
     * Default Credentials.
     */
    getClient(): Promise<AnyAuthClient | T>;
    /**
     * Creates a client which will fetch an ID token for authorization.
     * @param targetAudience the audience for the fetched ID token.
     * @returns IdTokenClient for making HTTP calls authenticated with ID tokens.
     */
    getIdTokenClient(targetAudience: string): Promise<IdTokenClient>;
    /**
     * Automatically obtain application default credentials, and return
     * an access token for making requests.
     */
    getAccessToken(): Promise<string | null | undefined>;
    /**
     * Obtain the HTTP headers that will provide authorization for a given
     * request.
     */
    getRequestHeaders(url?: string | URL): Promise<Headers>;
    /**
     * Obtain credentials for a request, then attach the appropriate headers to
     * the request options.
     * @param opts Axios or Request options on which to attach the headers
     */
    authorizeRequest(opts?: Pick<GaxiosOptions, 'url' | 'headers'>): Promise<Pick<GaxiosOptions, "headers" | "url">>;
    /**
     * A {@link fetch `fetch`} compliant API for {@link GoogleAuth}.
     *
     * @see {@link GoogleAuth.request} for the classic method.
     *
     * @remarks
     *
     * This is useful as a drop-in replacement for `fetch` API usage.
     *
     * @example
     *
     * ```ts
     * const auth = new GoogleAuth();
     * const fetchWithAuth: typeof fetch = (...args) => auth.fetch(...args);
     * await fetchWithAuth('https://example.com');
     * ```
     *
     * @param args `fetch` API or {@link Gaxios.fetch `Gaxios#fetch`} parameters
     * @returns the {@link GaxiosResponse} with Gaxios-added properties
     */
    fetch<T>(...args: Parameters<AuthClient['fetch']>): Promise<GaxiosResponse<T>>;
    /**
     * Automatically obtain application default credentials, and make an
     * HTTP request using the given options.
     *
     * @see {@link GoogleAuth.fetch} for the modern method.
     *
     * @param opts Axios request options for the HTTP request.
     */
    request<T>(opts: GaxiosOptions): Promise<GaxiosResponse<T>>;
    /**
     * Determine the compute environment in which the code is running.
     */
    getEnv(): Promise<GCPEnv>;
    /**
     * Sign the given data with the current private key, or go out
     * to the IAM API to sign it.
     * @param data The data to be signed.
     * @param endpoint A custom endpoint to use.
     *
     * @example
     * ```
     * sign('data', 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/');
     * ```
     */
    sign(data: string, endpoint?: string): Promise<string>;
    private signBlob;
}
export interface SignBlobResponse {
    keyId: string;
    signedBlob: string;
}
