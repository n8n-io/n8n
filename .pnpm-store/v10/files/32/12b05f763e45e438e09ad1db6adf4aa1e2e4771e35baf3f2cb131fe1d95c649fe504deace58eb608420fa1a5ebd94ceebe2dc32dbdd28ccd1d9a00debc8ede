/// <reference types="node" />
import { AbortSignalLike } from '@azure/abort-controller';
import { AccessToken } from '@azure/core-auth';
import { AzureLogger } from '@azure/logger';
import { Debugger } from '@azure/logger';
import { GetTokenOptions } from '@azure/core-auth';
import { OperationTracingOptions } from '@azure/core-tracing';
import { TokenCredential } from '@azure/core-auth';
/**
 * Options when adding a policy to the pipeline.
 * Used to express dependencies on other policies.
 */
export declare interface AddPipelineOptions {
    /**
     * Policies that this policy must come before.
     */
    beforePolicies?: string[];
    /**
     * Policies that this policy must come after.
     */
    afterPolicies?: string[];
    /**
     * The phase that this policy must come after.
     */
    afterPhase?: PipelinePhase;
    /**
     * The phase this policy belongs to.
     */
    phase?: PipelinePhase;
}
/**
 * An interface compatible with NodeJS's `http.Agent`.
 * We want to avoid publicly re-exporting the actual interface,
 * since it might vary across runtime versions.
 */
export declare interface Agent {
    /**
     * Destroy any sockets that are currently in use by the agent.
     */
    destroy(): void;
    /**
     * For agents with keepAlive enabled, this sets the maximum number of sockets that will be left open in the free state.
     */
    maxFreeSockets: number;
    /**
     * Determines how many concurrent sockets the agent can have open per origin.
     */
    maxSockets: number;
    /**
     * An object which contains queues of requests that have not yet been assigned to sockets.
     */
    requests: unknown;
    /**
     * An object which contains arrays of sockets currently in use by the agent.
     */
    sockets: unknown;
}
/**
 * Options sent to the authorizeRequestOnChallenge callback
 */
export declare interface AuthorizeRequestOnChallengeOptions {
    /**
     * The scopes for which the bearer token applies.
     */
    scopes: string[];
    /**
     * Function that retrieves either a cached access token or a new access token.
     */
    getAccessToken: (scopes: string[], options: GetTokenOptions) => Promise<AccessToken | null>;
    /**
     * Request that the policy is trying to fulfill.
     */
    request: PipelineRequest;
    /**
     * Response containing the challenge.
     */
    response: PipelineResponse;
    /**
     * A logger, if one was sent through the HTTP pipeline.
     */
    logger?: AzureLogger;
}
/**
 * Options sent to the authorizeRequest callback
 */
export declare interface AuthorizeRequestOptions {
    /**
     * The scopes for which the bearer token applies.
     */
    scopes: string[];
    /**
     * Function that retrieves either a cached access token or a new access token.
     */
    getAccessToken: (scopes: string[], options: GetTokenOptions) => Promise<AccessToken | null>;
    /**
     * Request that the policy is trying to fulfill.
     */
    request: PipelineRequest;
    /**
     * A logger, if one was sent through the HTTP pipeline.
     */
    logger?: AzureLogger;
}
/**
 * A policy that can request a token from a TokenCredential implementation and
 * then apply it to the Authorization header of a request as a Bearer token.
 */
export declare function bearerTokenAuthenticationPolicy(options: BearerTokenAuthenticationPolicyOptions): PipelinePolicy;
/**
 * The programmatic identifier of the bearerTokenAuthenticationPolicy.
 */
export declare const bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
/**
 * Options to configure the bearerTokenAuthenticationPolicy
 */
export declare interface BearerTokenAuthenticationPolicyOptions {
    /**
     * The TokenCredential implementation that can supply the bearer token.
     */
    credential?: TokenCredential;
    /**
     * The scopes for which the bearer token applies.
     */
    scopes: string | string[];
    /**
     * Allows for the processing of [Continuous Access Evaluation](https://docs.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation) challenges.
     * If provided, it must contain at least the `authorizeRequestOnChallenge` method.
     * If provided, after a request is sent, if it has a challenge, it can be processed to re-send the original request with the relevant challenge information.
     */
    challengeCallbacks?: ChallengeCallbacks;
    /**
     * A logger can be sent for debugging purposes.
     */
    logger?: AzureLogger;
}
/**
 * Options to override the processing of [Continuous Access Evaluation](https://docs.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation) challenges.
 */
export declare interface ChallengeCallbacks {
    /**
     * Allows for the authorization of the main request of this policy before it's sent.
     */
    authorizeRequest?(options: AuthorizeRequestOptions): Promise<void>;
    /**
     * Allows to handle authentication challenges and to re-authorize the request.
     * The response containing the challenge is `options.response`.
     * If this method returns true, the underlying request will be sent once again.
     * The request may be modified before being sent.
     */
    authorizeRequestOnChallenge?(options: AuthorizeRequestOnChallengeOptions): Promise<boolean>;
}
/**
 * Create the correct HttpClient for the current environment.
 */
export declare function createDefaultHttpClient(): HttpClient;
/**
 * Creates a totally empty pipeline.
 * Useful for testing or creating a custom one.
 */
export declare function createEmptyPipeline(): Pipeline;
/**
 * Creates an object that satisfies the `HttpHeaders` interface.
 * @param rawHeaders - A simple object representing initial headers
 */
export declare function createHttpHeaders(rawHeaders?: RawHttpHeadersInput): HttpHeaders;
/**
 * Create a new pipeline with a default set of customizable policies.
 * @param options - Options to configure a custom pipeline.
 */
export declare function createPipelineFromOptions(options: InternalPipelineOptions): Pipeline;
/**
 * Creates a new pipeline request with the given options.
 * This method is to allow for the easy setting of default values and not required.
 * @param options - The options to create the request with.
 */
export declare function createPipelineRequest(options: PipelineRequestOptions): PipelineRequest;
/**
 * A policy to enable response decompression according to Accept-Encoding header
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
 */
export declare function decompressResponsePolicy(): PipelinePolicy;
/**
 * The programmatic identifier of the decompressResponsePolicy.
 */
export declare const decompressResponsePolicyName = "decompressResponsePolicy";
/**
 * A policy that retries according to three strategies:
 * - When the server sends a 429 response with a Retry-After header.
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
 */
export declare function defaultRetryPolicy(options?: DefaultRetryPolicyOptions): PipelinePolicy;
/**
 * Options that control how to retry failed requests.
 */
export declare interface DefaultRetryPolicyOptions extends PipelineRetryOptions {
}
/**
 * A policy that attempts to retry requests while introducing an exponentially increasing delay.
 * @param options - Options that configure retry logic.
 */
export declare function exponentialRetryPolicy(options?: ExponentialRetryPolicyOptions): PipelinePolicy;
/**
 * The programmatic identifier of the exponentialRetryPolicy.
 */
export declare const exponentialRetryPolicyName = "exponentialRetryPolicy";
/**
 * Options that control how to retry failed requests.
 */
export declare interface ExponentialRetryPolicyOptions {
    /**
     * The maximum number of retry attempts. Defaults to 3.
     */
    maxRetries?: number;
    /**
     * The amount of delay in milliseconds between retry attempts. Defaults to 1000
     * (1 second.) The delay increases exponentially with each retry up to a maximum
     * specified by maxRetryDelayInMs.
     */
    retryDelayInMs?: number;
    /**
     * The maximum delay in milliseconds allowed before retrying an operation. Defaults
     * to 64000 (64 seconds).
     */
    maxRetryDelayInMs?: number;
}
/**
 * A simple object that provides form data, as if from a browser form.
 */
export declare type FormDataMap = {
    [key: string]: FormDataValue | FormDataValue[];
};
/**
 * A policy that encodes FormData on the request into the body.
 */
export declare function formDataPolicy(): PipelinePolicy;
/**
 * The programmatic identifier of the formDataPolicy.
 */
export declare const formDataPolicyName = "formDataPolicy";
/**
 * Each form data entry can be a string or (in the browser) a Blob.
 */
export declare type FormDataValue = string | Blob;
/**
 * This method converts a proxy url into `ProxySettings` for use with ProxyPolicy.
 * If no argument is given, it attempts to parse a proxy URL from the environment
 * variables `HTTPS_PROXY` or `HTTP_PROXY`.
 * @param proxyUrl - The url of the proxy to use. May contain authentication information.
 */
export declare function getDefaultProxySettings(proxyUrl?: string): ProxySettings | undefined;
/**
 * The required interface for a client that makes HTTP requests
 * on behalf of a pipeline.
 */
export declare interface HttpClient {
    /**
     * The method that makes the request and returns a response.
     */
    sendRequest: SendRequest;
}
/**
 * Represents a set of HTTP headers on a request/response.
 * Header names are treated as case insensitive.
 */
export declare interface HttpHeaders extends Iterable<[
    string,
    string
]> {
    /**
     * Returns the value of a specific header or undefined if not set.
     * @param name - The name of the header to retrieve.
     */
    get(name: string): string | undefined;
    /**
     * Returns true if the specified header exists.
     * @param name - The name of the header to check.
     */
    has(name: string): boolean;
    /**
     * Sets a specific header with a given value.
     * @param name - The name of the header to set.
     * @param value - The value to use for the header.
     */
    set(name: string, value: string | number | boolean): void;
    /**
     * Removes a specific header from the collection.
     * @param name - The name of the header to delete.
     */
    delete(name: string): void;
    /**
     * Accesses a raw JS object that acts as a simple map
     * of header names to values.
     */
    toJSON(options?: {
        preserveCase?: boolean;
    }): RawHttpHeaders;
}
/**
 * Supported HTTP methods to use when making requests.
 */
export declare type HttpMethods = "GET" | "PUT" | "POST" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE";
/**
 * Defines options that are used to configure internal options of
 * the HTTP pipeline for an SDK client.
 */
export declare interface InternalPipelineOptions extends PipelineOptions {
    /**
     * Options to configure request/response logging.
     */
    loggingOptions?: LogPolicyOptions;
}
/**
 * Typeguard for RestError
 * @param e - Something caught by a catch clause.
 */
export declare function isRestError(e: unknown): e is RestError;
/**
 * An interface compatible with NodeJS's `tls.KeyObject`.
 * We want to avoid publicly re-exporting the actual interface,
 * since it might vary across runtime versions.
 */
export declare interface KeyObject {
    /**
     * Private keys in PEM format.
     */
    pem: string | Buffer;
    /**
     * Optional passphrase.
     */
    passphrase?: string | undefined;
}
/**
 * A policy that logs all requests and responses.
 * @param options - Options to configure logPolicy.
 */
export declare function logPolicy(options?: LogPolicyOptions): PipelinePolicy;
/**
 * The programmatic identifier of the logPolicy.
 */
export declare const logPolicyName = "logPolicy";
/**
 * Options to configure the logPolicy.
 */
export declare interface LogPolicyOptions {
    /**
     * Header names whose values will be logged when logging is enabled.
     * Defaults include a list of well-known safe headers. Any headers
     * specified in this field will be added to that list.  Any other values will
     * be written to logs as "REDACTED".
     */
    additionalAllowedHeaderNames?: string[];
    /**
     * Query string names whose values will be logged when logging is enabled. By default no
     * query string values are logged.
     */
    additionalAllowedQueryParameters?: string[];
    /**
     * The log function to use for writing pipeline logs.
     * Defaults to core-http's built-in logger.
     * Compatible with the `debug` library.
     */
    logger?: Debugger;
}
/**
 * ndJsonPolicy is a policy used to control keep alive settings for every request.
 */
export declare function ndJsonPolicy(): PipelinePolicy;
/**
 * The programmatic identifier of the ndJsonPolicy.
 */
export declare const ndJsonPolicyName = "ndJsonPolicy";
/**
 * Represents a pipeline for making a HTTP request to a URL.
 * Pipelines can have multiple policies to manage manipulating each request
 * before and after it is made to the server.
 */
export declare interface Pipeline {
    /**
     * Add a new policy to the pipeline.
     * @param policy - A policy that manipulates a request.
     * @param options - A set of options for when the policy should run.
     */
    addPolicy(policy: PipelinePolicy, options?: AddPipelineOptions): void;
    /**
     * Remove a policy from the pipeline.
     * @param options - Options that let you specify which policies to remove.
     */
    removePolicy(options: {
        name?: string;
        phase?: PipelinePhase;
    }): PipelinePolicy[];
    /**
     * Uses the pipeline to make a HTTP request.
     * @param httpClient - The HttpClient that actually performs the request.
     * @param request - The request to be made.
     */
    sendRequest(httpClient: HttpClient, request: PipelineRequest): Promise<PipelineResponse>;
    /**
     * Returns the current set of policies in the pipeline in the order in which
     * they will be applied to the request. Later in the list is closer to when
     * the request is performed.
     */
    getOrderedPolicies(): PipelinePolicy[];
    /**
     * Duplicates this pipeline to allow for modifying an existing one without mutating it.
     */
    clone(): Pipeline;
}
/**
 * Defines options that are used to configure the HTTP pipeline for
 * an SDK client.
 */
export declare interface PipelineOptions {
    /**
     * Options that control how to retry failed requests.
     */
    retryOptions?: PipelineRetryOptions;
    /**
     * Options to configure a proxy for outgoing requests.
     */
    proxyOptions?: ProxySettings;
    /** Options for configuring TLS authentication */
    tlsOptions?: TlsSettings;
    /**
     * Options for how redirect responses are handled.
     */
    redirectOptions?: RedirectPolicyOptions;
    /**
     * Options for adding user agent details to outgoing requests.
     */
    userAgentOptions?: UserAgentPolicyOptions;
}
/**
 * Policies are executed in phases.
 * The execution order is:
 * 1. Serialize Phase
 * 2. Policies not in a phase
 * 3. Deserialize Phase
 * 4. Retry Phase
 * 5. Sign Phase
 */
export declare type PipelinePhase = "Deserialize" | "Serialize" | "Retry" | "Sign";
/**
 * A pipeline policy manipulates a request as it travels through the pipeline.
 * It is conceptually a middleware that is allowed to modify the request before
 * it is made as well as the response when it is received.
 */
export declare interface PipelinePolicy {
    /**
     * The policy name. Must be a unique string in the pipeline.
     */
    name: string;
    /**
     * The main method to implement that manipulates a request/response.
     * @param request - The request being performed.
     * @param next - The next policy in the pipeline. Must be called to continue the pipeline.
     */
    sendRequest(request: PipelineRequest, next: SendRequest): Promise<PipelineResponse>;
}
/**
 * Metadata about a request being made by the pipeline.
 */
export declare interface PipelineRequest {
    /**
     * The URL to make the request to.
     */
    url: string;
    /**
     * The HTTP method to use when making the request.
     */
    method: HttpMethods;
    /**
     * The HTTP headers to use when making the request.
     */
    headers: HttpHeaders;
    /**
     * The number of milliseconds a request can take before automatically being terminated.
     * If the request is terminated, an `AbortError` is thrown.
     * Defaults to 0, which disables the timeout.
     */
    timeout: number;
    /**
     * Indicates whether the user agent should send cookies from the other domain in the case of cross-origin requests.
     * Defaults to false.
     */
    withCredentials: boolean;
    /**
     * A unique identifier for the request. Used for logging and tracing.
     */
    requestId: string;
    /**
     * The HTTP body content (if any)
     */
    body?: RequestBodyType;
    /**
     * To simulate a browser form post
     */
    formData?: FormDataMap;
    /**
     * A list of response status codes whose corresponding PipelineResponse body should be treated as a stream.
     * When streamResponseStatusCodes contains the value Number.POSITIVE_INFINITY any status would be treated as a stream.
     */
    streamResponseStatusCodes?: Set<number>;
    /**
     * Proxy configuration.
     */
    proxySettings?: ProxySettings;
    /**
     * If the connection should not be reused.
     */
    disableKeepAlive?: boolean;
    /**
     * Used to abort the request later.
     */
    abortSignal?: AbortSignalLike;
    /**
     * Tracing options to use for any created Spans.
     */
    tracingOptions?: OperationTracingOptions;
    /**
     * Callback which fires upon upload progress.
     */
    onUploadProgress?: (progress: TransferProgressEvent) => void;
    /** Callback which fires upon download progress. */
    onDownloadProgress?: (progress: TransferProgressEvent) => void;
    /** Set to true if the request is sent over HTTP instead of HTTPS */
    allowInsecureConnection?: boolean;
    /**
     * NODEJS ONLY
     *
     * A Node-only option to provide a custom `http.Agent`/`https.Agent`.
     * Does nothing when running in the browser.
     */
    agent?: Agent;
    /**
     * BROWSER ONLY
     *
     * A browser only option to enable browser Streams. If this option is set and a response is a stream
     * the response will have a property `browserStream` instead of `blobBody` which will be undefined.
     *
     * Default value is false
     */
    enableBrowserStreams?: boolean;
    /** Settings for configuring TLS authentication */
    tlsSettings?: TlsSettings;
}
/**
 * Settings to initialize a request.
 * Almost equivalent to Partial<PipelineRequest>, but url is mandatory.
 */
export declare interface PipelineRequestOptions {
    /**
     * The URL to make the request to.
     */
    url: string;
    /**
     * The HTTP method to use when making the request.
     */
    method?: HttpMethods;
    /**
     * The HTTP headers to use when making the request.
     */
    headers?: HttpHeaders;
    /**
     * The number of milliseconds a request can take before automatically being terminated.
     * If the request is terminated, an `AbortError` is thrown.
     * Defaults to 0, which disables the timeout.
     */
    timeout?: number;
    /**
     * If credentials (cookies) should be sent along during an XHR.
     * Defaults to false.
     */
    withCredentials?: boolean;
    /**
     * A unique identifier for the request. Used for logging and tracing.
     */
    requestId?: string;
    /**
     * The HTTP body content (if any)
     */
    body?: RequestBodyType;
    /**
     * To simulate a browser form post
     */
    formData?: FormDataMap;
    /**
     * A list of response status codes whose corresponding PipelineResponse body should be treated as a stream.
     */
    streamResponseStatusCodes?: Set<number>;
    /**
     * BROWSER ONLY
     *
     * A browser only option to enable use of the Streams API. If this option is set and streaming is used
     * (see `streamResponseStatusCodes`), the response will have a property `browserStream` instead of
     * `blobBody` which will be undefined.
     *
     * Default value is false
     */
    enableBrowserStreams?: boolean;
    /**
     * Proxy configuration.
     */
    proxySettings?: ProxySettings;
    /**
     * If the connection should not be reused.
     */
    disableKeepAlive?: boolean;
    /**
     * Used to abort the request later.
     */
    abortSignal?: AbortSignalLike;
    /**
     * Options used to create a span when tracing is enabled.
     */
    tracingOptions?: OperationTracingOptions;
    /**
     * Callback which fires upon upload progress.
     */
    onUploadProgress?: (progress: TransferProgressEvent) => void;
    /** Callback which fires upon download progress. */
    onDownloadProgress?: (progress: TransferProgressEvent) => void;
    /** Set to true if the request is sent over HTTP instead of HTTPS */
    allowInsecureConnection?: boolean;
}
/**
 * Metadata about a response received by the pipeline.
 */
export declare interface PipelineResponse {
    /**
     * The request that generated this response.
     */
    request: PipelineRequest;
    /**
     * The HTTP status code of the response.
     */
    status: number;
    /**
     * The HTTP response headers.
     */
    headers: HttpHeaders;
    /**
     * The response body as text (string format)
     */
    bodyAsText?: string | null;
    /**
     * BROWSER ONLY
     *
     * The response body as a browser Blob.
     * Always undefined in node.js.
     */
    blobBody?: Promise<Blob>;
    /**
     * BROWSER ONLY
     *
     * The response body as a browser ReadableStream.
     * Always undefined in node.js.
     */
    browserStreamBody?: ReadableStream<Uint8Array>;
    /**
     * NODEJS ONLY
     *
     * The response body as a node.js Readable stream.
     * Always undefined in the browser.
     */
    readableStreamBody?: NodeJS.ReadableStream;
}
/**
 * Options that control how to retry failed requests.
 */
export declare interface PipelineRetryOptions {
    /**
     * The maximum number of retry attempts. Defaults to 3.
     */
    maxRetries?: number;
    /**
     * The amount of delay in milliseconds between retry attempts. Defaults to 1000
     * (1 second). The delay increases exponentially with each retry up to a maximum
     * specified by maxRetryDelayInMs.
     */
    retryDelayInMs?: number;
    /**
     * The maximum delay in milliseconds allowed before retrying an operation. Defaults
     * to 64000 (64 seconds).
     */
    maxRetryDelayInMs?: number;
}
/**
 * A policy that allows one to apply proxy settings to all requests.
 * If not passed static settings, they will be retrieved from the HTTPS_PROXY
 * or HTTP_PROXY environment variables.
 * @param proxySettings - ProxySettings to use on each request.
 * @param options - additional settings, for example, custom NO_PROXY patterns
 */
export declare function proxyPolicy(proxySettings?: ProxySettings | undefined, options?: {
    /** a list of patterns to override those loaded from NO_PROXY environment variable. */
    customNoProxyList?: string[];
}): PipelinePolicy;
/**
 * The programmatic identifier of the proxyPolicy.
 */
export declare const proxyPolicyName = "proxyPolicy";
/**
 * Options to configure a proxy for outgoing requests (Node.js only).
 */
export declare interface ProxySettings {
    /**
     * The proxy's host address.
     */
    host: string;
    /**
     * The proxy host's port.
     */
    port: number;
    /**
     * The user name to authenticate with the proxy, if required.
     */
    username?: string;
    /**
     * The password to authenticate with the proxy, if required.
     */
    password?: string;
}
/**
 * An interface compatible with NodeJS's `tls.PxfObject`.
 * We want to avoid publicly re-exporting the actual interface,
 * since it might vary across runtime versions.
 */
export declare interface PxfObject {
    /**
     * PFX or PKCS12 encoded private key and certificate chain.
     */
    buf: string | Buffer;
    /**
     * Optional passphrase.
     */
    passphrase?: string | undefined;
}
/**
 * A HttpHeaders collection represented as a simple JSON object.
 */
export declare type RawHttpHeaders = {
    [headerName: string]: string;
};
/**
 * A HttpHeaders collection for input, represented as a simple JSON object.
 */
export declare type RawHttpHeadersInput = Record<string, string | number | boolean>;
/**
 * A policy to follow Location headers from the server in order
 * to support server-side redirection.
 * In the browser, this policy is not used.
 * @param options - Options to control policy behavior.
 */
export declare function redirectPolicy(options?: RedirectPolicyOptions): PipelinePolicy;
/**
 * The programmatic identifier of the redirectPolicy.
 */
export declare const redirectPolicyName = "redirectPolicy";
/**
 * Options for how redirect responses are handled.
 */
export declare interface RedirectPolicyOptions {
    /**
     * The maximum number of times the redirect URL will be tried before
     * failing.  Defaults to 20.
     */
    maxRetries?: number;
}
/**
 * Types of bodies supported on the request.
 * NodeJS.ReadableStream and () =\> NodeJS.ReadableStream is Node only.
 * Blob, ReadableStream<Uint8Array>, and () =\> ReadableStream<Uint8Array> are browser only.
 */
export declare type RequestBodyType = NodeJS.ReadableStream | (() => NodeJS.ReadableStream) | ReadableStream<Uint8Array> | (() => ReadableStream<Uint8Array>) | Blob | ArrayBuffer | ArrayBufferView | FormData | string | null;
/**
 * A custom error type for failed pipeline requests.
 */
export declare class RestError extends Error {
    /**
     * Something went wrong when making the request.
     * This means the actual request failed for some reason,
     * such as a DNS issue or the connection being lost.
     */
    static readonly REQUEST_SEND_ERROR: string;
    /**
     * This means that parsing the response from the server failed.
     * It may have been malformed.
     */
    static readonly PARSE_ERROR: string;
    /**
     * The code of the error itself (use statics on RestError if possible.)
     */
    code?: string;
    /**
     * The HTTP status code of the request (if applicable.)
     */
    statusCode?: number;
    /**
     * The request that was made.
     */
    request?: PipelineRequest;
    /**
     * The response received (if any.)
     */
    response?: PipelineResponse;
    /**
     * Bonus property set by the throw site.
     */
    details?: unknown;
    constructor(message: string, options?: RestErrorOptions);
}
/**
 * The options supported by RestError.
 */
export declare interface RestErrorOptions {
    /**
     * The code of the error itself (use statics on RestError if possible.)
     */
    code?: string;
    /**
     * The HTTP status code of the request (if applicable.)
     */
    statusCode?: number;
    /**
     * The request that was made.
     */
    request?: PipelineRequest;
    /**
     * The response received (if any.)
     */
    response?: PipelineResponse;
}
/**
 * Information provided to the retry strategy about the current progress of the retry policy.
 */
export declare interface RetryInformation {
    /**
     * A {@link PipelineResponse}, if the last retry attempt succeeded.
     */
    response?: PipelineResponse;
    /**
     * A {@link RestError}, if the last retry attempt failed.
     */
    responseError?: RestError;
    /**
     * Total number of retries so far.
     */
    retryCount: number;
}
/**
 * Properties that can modify the behavior of the retry policy.
 */
export declare interface RetryModifiers {
    /**
     * If true, allows skipping the current strategy from running on the retry policy.
     */
    skipStrategy?: boolean;
    /**
     * Indicates to retry against this URL.
     */
    redirectTo?: string;
    /**
     * Controls whether to retry in a given number of milliseconds.
     * If provided, a new retry will be attempted.
     */
    retryAfterInMs?: number;
    /**
     * Indicates to throw this error instead of retrying.
     */
    errorToThrow?: RestError;
}
/**
 * retryPolicy is a generic policy to enable retrying requests when certain conditions are met
 */
export declare function retryPolicy(strategies: RetryStrategy[], options?: RetryPolicyOptions): PipelinePolicy;
/**
 * Options to the {@link retryPolicy}
 */
export declare interface RetryPolicyOptions {
    /**
     * Maximum number of retries. If not specified, it will limit to 3 retries.
     */
    maxRetries?: number;
    /**
     * Logger. If it's not provided, a default logger is used.
     */
    logger?: AzureLogger;
}
/**
 * A retry strategy is intended to define whether to retry or not, and how to retry.
 */
export declare interface RetryStrategy {
    /**
     * Name of the retry strategy. Used for logging.
     */
    name: string;
    /**
     * Logger. If it's not provided, a default logger for all retry strategies is used.
     */
    logger?: AzureLogger;
    /**
     * Function that determines how to proceed with the subsequent requests.
     * @param state - Retry state
     */
    retry(state: RetryInformation): RetryModifiers;
}
/**
 * A simple interface for making a pipeline request and receiving a response.
 */
export declare type SendRequest = (request: PipelineRequest) => Promise<PipelineResponse>;
/**
 * Each PipelineRequest gets a unique id upon creation.
 * This policy passes that unique id along via an HTTP header to enable better
 * telemetry and tracing.
 * @param requestIdHeaderName - The name of the header to pass the request ID to.
 */
export declare function setClientRequestIdPolicy(requestIdHeaderName?: string): PipelinePolicy;
/**
 * The programmatic identifier of the setClientRequestIdPolicy.
 */
export declare const setClientRequestIdPolicyName = "setClientRequestIdPolicy";
/**
 * A retry policy that specifically seeks to handle errors in the
 * underlying transport layer (e.g. DNS lookup failures) rather than
 * retryable error codes from the server itself.
 * @param options - Options that customize the policy.
 */
export declare function systemErrorRetryPolicy(options?: SystemErrorRetryPolicyOptions): PipelinePolicy;
/**
 * Name of the {@link systemErrorRetryPolicy}
 */
export declare const systemErrorRetryPolicyName = "systemErrorRetryPolicy";
/**
 * Options that control how to retry failed requests.
 */
export declare interface SystemErrorRetryPolicyOptions {
    /**
     * The maximum number of retry attempts. Defaults to 3.
     */
    maxRetries?: number;
    /**
     * The amount of delay in milliseconds between retry attempts. Defaults to 1000
     * (1 second.) The delay increases exponentially with each retry up to a maximum
     * specified by maxRetryDelayInMs.
     */
    retryDelayInMs?: number;
    /**
     * The maximum delay in milliseconds allowed before retrying an operation. Defaults
     * to 64000 (64 seconds).
     */
    maxRetryDelayInMs?: number;
}
/**
 * A policy that retries when the server sends a 429 response with a Retry-After header.
 *
 * To learn more, please refer to
 * https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-manager-request-limits,
 * https://docs.microsoft.com/en-us/azure/azure-subscription-service-limits and
 * https://docs.microsoft.com/en-us/azure/virtual-machines/troubleshooting/troubleshooting-throttling-errors
 *
 * @param options - Options that configure retry logic.
 */
export declare function throttlingRetryPolicy(options?: ThrottlingRetryPolicyOptions): PipelinePolicy;
/**
 * Name of the {@link throttlingRetryPolicy}
 */
export declare const throttlingRetryPolicyName = "throttlingRetryPolicy";
/**
 * Options that control how to retry failed requests.
 */
export declare interface ThrottlingRetryPolicyOptions {
    /**
     * The maximum number of retry attempts. Defaults to 3.
     */
    maxRetries?: number;
}
/**
 * Gets a pipeline policy that adds the client certificate to the HttpClient agent for authentication.
 */
export declare function tlsPolicy(tlsSettings?: TlsSettings): PipelinePolicy;
/**
 * Name of the TLS Policy
 */
export declare const tlsPolicyName = "tlsPolicy";
/**
 * Represents a certificate for TLS authentication.
 */
export declare interface TlsSettings {
    /**
     * Optionally override the trusted CA certificates. Default is to trust
     * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
     * replaced when CAs are explicitly specified using this option.
     */
    ca?: string | Buffer | Array<string | Buffer> | undefined;
    /**
     *  Cert chains in PEM format. One cert chain should be provided per
     *  private key. Each cert chain should consist of the PEM formatted
     *  certificate for a provided private key, followed by the PEM
     *  formatted intermediate certificates (if any), in order, and not
     *  including the root CA (the root CA must be pre-known to the peer,
     *  see ca). When providing multiple cert chains, they do not have to
     *  be in the same order as their private keys in key. If the
     *  intermediate certificates are not provided, the peer will not be
     *  able to validate the certificate, and the handshake will fail.
     */
    cert?: string | Buffer | Array<string | Buffer> | undefined;
    /**
     * Private keys in PEM format. PEM allows the option of private keys
     * being encrypted. Encrypted keys will be decrypted with
     * options.passphrase. Multiple keys using different algorithms can be
     * provided either as an array of unencrypted key strings or buffers,
     * or an array of objects in the form `{pem: <string|buffer>[,passphrase: <string>]}`.
     * The object form can only occur in an array.object.passphrase is optional.
     * Encrypted keys will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
     */
    key?: string | Buffer | Array<Buffer | KeyObject> | undefined;
    /**
     * Shared passphrase used for a single private key and/or a PFX.
     */
    passphrase?: string | undefined;
    /**
     * PFX or PKCS12 encoded private key and certificate chain. pfx is an
     * alternative to providing key and cert individually. PFX is usually
     * encrypted, if it is, passphrase will be used to decrypt it. Multiple
     * PFX can be provided either as an array of unencrypted PFX buffers,
     * or an array of objects in the form `{buf: <string|buffer>[,passphrase: <string>]}`.
     * The object form can only occur in an array.object.passphrase is optional.
     * Encrypted PFX will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
     */
    pfx?: string | Buffer | Array<string | Buffer | PxfObject> | undefined;
}
/**
 * A simple policy to create OpenTelemetry Spans for each request made by the pipeline
 * that has SpanOptions with a parent.
 * Requests made without a parent Span will not be recorded.
 * @param options - Options to configure the telemetry logged by the tracing policy.
 */
export declare function tracingPolicy(options?: TracingPolicyOptions): PipelinePolicy;
/**
 * The programmatic identifier of the tracingPolicy.
 */
export declare const tracingPolicyName = "tracingPolicy";
/**
 * Options to configure the tracing policy.
 */
export declare interface TracingPolicyOptions {
    /**
     * String prefix to add to the user agent logged as metadata
     * on the generated Span.
     * Defaults to an empty string.
     */
    userAgentPrefix?: string;
}
/**
 * Fired in response to upload or download progress.
 */
export declare type TransferProgressEvent = {
    /**
     * The number of bytes loaded so far.
     */
    loadedBytes: number;
};
/**
 * A policy that sets the User-Agent header (or equivalent) to reflect
 * the library version.
 * @param options - Options to customize the user agent value.
 */
export declare function userAgentPolicy(options?: UserAgentPolicyOptions): PipelinePolicy;
/**
 * The programmatic identifier of the userAgentPolicy.
 */
export declare const userAgentPolicyName = "userAgentPolicy";
/**
 * Options for adding user agent details to outgoing requests.
 */
export declare interface UserAgentPolicyOptions {
    /**
     * String prefix to add to the user agent for outgoing requests.
     * Defaults to an empty string.
     */
    userAgentPrefix?: string;
}
export {};
