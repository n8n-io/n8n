import { EventEmitter } from 'events';
import { Gaxios, GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
import { Credentials } from './credentials';
import { OriginalAndCamel } from '../util';
/**
 * An interface for enforcing `fetch`-type compliance.
 *
 * @remarks
 *
 * This provides type guarantees during build-time, ensuring the `fetch` method is 1:1
 * compatible with the `Gaxios#fetch` API.
 */
interface GaxiosFetchCompliance {
    fetch: typeof fetch | Gaxios['fetch'];
}
/**
 * Easy access to symbol-indexed strings on config objects.
 */
export type SymbolIndexString = {
    [key: symbol]: string | undefined;
};
/**
 * Base auth configurations (e.g. from JWT or `.json` files) with conventional
 * camelCased options.
 *
 * @privateRemarks
 *
 * This interface is purposely not exported so that it can be removed once
 * {@link https://github.com/microsoft/TypeScript/issues/50715} has been
 * resolved. Then, we can use {@link OriginalAndCamel} to shrink this interface.
 *
 * Tracking: {@link https://github.com/googleapis/google-auth-library-nodejs/issues/1686}
 */
interface AuthJSONOptions {
    /**
     * The project ID corresponding to the current credentials if available.
     */
    project_id: string | null;
    /**
     * An alias for {@link AuthJSONOptions.project_id `project_id`}.
     */
    projectId: AuthJSONOptions['project_id'];
    /**
     * The quota project ID. The quota project can be used by client libraries for the billing purpose.
     * See {@link https://cloud.google.com/docs/quota Working with quotas}
     */
    quota_project_id: string;
    /**
     * An alias for {@link AuthJSONOptions.quota_project_id `quota_project_id`}.
     */
    quotaProjectId: AuthJSONOptions['quota_project_id'];
    /**
     * The default service domain for a given Cloud universe.
     *
     * @example
     * 'googleapis.com'
     */
    universe_domain: string;
    /**
     * An alias for {@link AuthJSONOptions.universe_domain `universe_domain`}.
     */
    universeDomain: AuthJSONOptions['universe_domain'];
}
/**
 * Base `AuthClient` configuration.
 *
 * The camelCased options are aliases of the snake_cased options, supporting both
 * JSON API and JS conventions.
 */
export interface AuthClientOptions extends Partial<OriginalAndCamel<AuthJSONOptions>> {
    /**
     * An API key to use, optional.
     */
    apiKey?: string;
    credentials?: Credentials;
    /**
     * The {@link Gaxios `Gaxios`} instance used for making requests.
     *
     * @see {@link AuthClientOptions.useAuthRequestParameters}
     */
    transporter?: Gaxios;
    /**
     * Provides default options to the transporter, such as {@link GaxiosOptions.agent `agent`} or
     *  {@link GaxiosOptions.retryConfig `retryConfig`}.
     *
     * This option is ignored if {@link AuthClientOptions.transporter `gaxios`} has been provided
     */
    transporterOptions?: GaxiosOptions;
    /**
     * The expiration threshold in milliseconds before forcing token refresh of
     * unexpired tokens.
     */
    eagerRefreshThresholdMillis?: number;
    /**
     * Whether to attempt to refresh tokens on status 401/403 responses
     * even if an attempt is made to refresh the token preemptively based
     * on the expiry_date.
     */
    forceRefreshOnFailure?: boolean;
    /**
     * Enables/disables the adding of the AuthClient's default interceptor.
     *
     * @see {@link AuthClientOptions.transporter}
     *
     * @remarks
     *
     * Disabling is useful for debugging and experimentation.
     *
     * @default true
     */
    useAuthRequestParameters?: boolean;
}
/**
 * The default cloud universe
 *
 * @see {@link AuthJSONOptions.universe_domain}
 */
export declare const DEFAULT_UNIVERSE = "googleapis.com";
/**
 * The default {@link AuthClientOptions.eagerRefreshThresholdMillis}
 */
export declare const DEFAULT_EAGER_REFRESH_THRESHOLD_MILLIS: number;
/**
 * Defines the root interface for all clients that generate credentials
 * for calling Google APIs. All clients should implement this interface.
 */
export interface CredentialsClient {
    projectId?: AuthClientOptions['projectId'];
    eagerRefreshThresholdMillis: NonNullable<AuthClientOptions['eagerRefreshThresholdMillis']>;
    forceRefreshOnFailure: NonNullable<AuthClientOptions['forceRefreshOnFailure']>;
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
     * @param url The URI being authorized.
     */
    getRequestHeaders(url?: string | URL): Promise<Headers>;
    /**
     * Provides an alternative Gaxios request implementation with auth credentials
     */
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    /**
     * Sets the auth credentials.
     */
    setCredentials(credentials: Credentials): void;
    /**
     * Subscribes a listener to the tokens event triggered when a token is
     * generated.
     *
     * @param event The tokens event to subscribe to.
     * @param listener The listener that triggers on event trigger.
     * @return The current client instance.
     */
    on(event: 'tokens', listener: (tokens: Credentials) => void): this;
}
export declare interface AuthClient {
    on(event: 'tokens', listener: (tokens: Credentials) => void): this;
}
/**
 * The base of all Auth Clients.
 */
export declare abstract class AuthClient extends EventEmitter implements CredentialsClient, GaxiosFetchCompliance {
    apiKey?: string;
    projectId?: string | null;
    /**
     * The quota project ID. The quota project can be used by client libraries for the billing purpose.
     * See {@link https://cloud.google.com/docs/quota Working with quotas}
     */
    quotaProjectId?: string;
    /**
     * The {@link Gaxios `Gaxios`} instance used for making requests.
     */
    transporter: Gaxios;
    credentials: Credentials;
    eagerRefreshThresholdMillis: number;
    forceRefreshOnFailure: boolean;
    universeDomain: string;
    /**
     * Symbols that can be added to GaxiosOptions to specify the method name that is
     * making an RPC call, for logging purposes, as well as a string ID that can be
     * used to correlate calls and responses.
     */
    static readonly RequestMethodNameSymbol: unique symbol;
    static readonly RequestLogIdSymbol: unique symbol;
    constructor(opts?: AuthClientOptions);
    /**
     * A {@link fetch `fetch`} compliant API for {@link AuthClient}.
     *
     * @see {@link AuthClient.request} for the classic method.
     *
     * @remarks
     *
     * This is useful as a drop-in replacement for `fetch` API usage.
     *
     * @example
     *
     * ```ts
     * const authClient = new AuthClient();
     * const fetchWithAuthClient: typeof fetch = (...args) => authClient.fetch(...args);
     * await fetchWithAuthClient('https://example.com');
     * ```
     *
     * @param args `fetch` API or {@link Gaxios.fetch `Gaxios#fetch`} parameters
     * @returns the {@link GaxiosResponse} with Gaxios-added properties
     */
    fetch<T>(...args: Parameters<Gaxios['fetch']>): GaxiosPromise<T>;
    /**
     * The public request API in which credentials may be added to the request.
     *
     * @see {@link AuthClient.fetch} for the modern method.
     *
     * @param options options for `gaxios`
     */
    abstract request<T>(options: GaxiosOptions): GaxiosPromise<T>;
    /**
     * The main authentication interface. It takes an optional url which when
     * present is the endpoint being accessed, and returns a Promise which
     * resolves with authorization header fields.
     *
     * The result has the form:
     * ```ts
     * new Headers({'authorization': 'Bearer <access_token_value>'});
     * ```
     *
     * @param url The URI being authorized.
     */
    abstract getRequestHeaders(url?: string | URL): Promise<Headers>;
    /**
     * @return A promise that resolves with the current GCP access token
     *   response. If the current credential is expired, a new one is retrieved.
     */
    abstract getAccessToken(): Promise<{
        token?: string | null;
        res?: GaxiosResponse | null;
    }>;
    /**
     * Sets the auth credentials.
     */
    setCredentials(credentials: Credentials): void;
    /**
     * Append additional headers, e.g., x-goog-user-project, shared across the
     * classes inheriting AuthClient. This method should be used by any method
     * that overrides getRequestMetadataAsync(), which is a shared helper for
     * setting request information in both gRPC and HTTP API calls.
     *
     * @param headers object to append additional headers to.
     */
    protected addSharedMetadataHeaders(headers: Headers): Headers;
    /**
     * Adds the `x-goog-user-project` and `authorization` headers to the target Headers
     * object, if they exist on the source.
     *
     * @param target the headers to target
     * @param source the headers to source from
     * @returns the target headers
     */
    protected addUserProjectAndAuthHeaders<T extends Headers>(target: T, source: Headers): T;
    static log: import("google-logging-utils").AdhocDebugLogFunction;
    static readonly DEFAULT_REQUEST_INTERCEPTOR: Parameters<Gaxios['interceptors']['request']['add']>[0];
    static readonly DEFAULT_RESPONSE_INTERCEPTOR: Parameters<Gaxios['interceptors']['response']['add']>[0];
    /**
     * Sets the method name that is making a Gaxios request, so that logging may tag
     * log lines with the operation.
     * @param config A Gaxios request config
     * @param methodName The method name making the call
     */
    static setMethodName(config: GaxiosOptions, methodName: string): void;
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
export type HeadersInit = ConstructorParameters<typeof Headers>[0];
export interface GetAccessTokenResponse {
    token?: string | null;
    res?: GaxiosResponse | null;
}
/**
 * @deprecated - use the Promise API instead
 */
export interface BodyResponseCallback<T> {
    (err: Error | null, res?: GaxiosResponse<T> | null): void;
}
export {};
