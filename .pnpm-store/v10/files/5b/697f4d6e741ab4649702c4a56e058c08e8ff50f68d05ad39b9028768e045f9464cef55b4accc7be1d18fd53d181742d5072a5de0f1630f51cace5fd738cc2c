import { EventEmitter } from 'events';
import { Gaxios, GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
import { Transporter } from '../transporters';
import { Credentials } from './credentials';
import { GetAccessTokenResponse, Headers } from './oauth2client';
import { OriginalAndCamel } from '../util';
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
     * A `Gaxios` or `Transporter` instance to use for `AuthClient` requests.
     */
    transporter?: Gaxios | Transporter;
    /**
     * Provides default options to the transporter, such as {@link GaxiosOptions.agent `agent`} or
     *  {@link GaxiosOptions.retryConfig `retryConfig`}.
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
     * { Authorization: 'Bearer <access_token_value>' }
     * @param url The URI being authorized.
     */
    getRequestHeaders(url?: string): Promise<Headers>;
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
export declare abstract class AuthClient extends EventEmitter implements CredentialsClient {
    apiKey?: string;
    projectId?: string | null;
    /**
     * The quota project ID. The quota project can be used by client libraries for the billing purpose.
     * See {@link https://cloud.google.com/docs/quota Working with quotas}
     */
    quotaProjectId?: string;
    transporter: Transporter;
    credentials: Credentials;
    eagerRefreshThresholdMillis: number;
    forceRefreshOnFailure: boolean;
    universeDomain: string;
    constructor(opts?: AuthClientOptions);
    /**
     * Return the {@link Gaxios `Gaxios`} instance from the {@link AuthClient.transporter}.
     *
     * @expiremental
     */
    get gaxios(): Gaxios | null;
    /**
     * Provides an alternative Gaxios request implementation with auth credentials
     */
    abstract request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    /**
     * The main authentication interface. It takes an optional url which when
     * present is the endpoint being accessed, and returns a Promise which
     * resolves with authorization header fields.
     *
     * The result has the form:
     * { Authorization: 'Bearer <access_token_value>' }
     * @param url The URI being authorized.
     */
    abstract getRequestHeaders(url?: string): Promise<Headers>;
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
export {};
