/**
 * A Shim Library that provides compatibility between Core V1 & V2 Packages.
 *
 * @packageDocumentation
 */

import { AbortSignalLike } from '@azure/abort-controller';
import { CommonClientOptions } from '@azure/core-client';
import { FullOperationResponse } from '@azure/core-client';
import { HttpClient } from '@azure/core-rest-pipeline';
import { HttpHeaders } from '@azure/core-rest-pipeline';
import { HttpMethods } from '@azure/core-rest-pipeline';
import { OperationArguments } from '@azure/core-client';
import { OperationSpec } from '@azure/core-client';
import { PipelinePolicy } from '@azure/core-rest-pipeline';
import { ProxySettings } from '@azure/core-rest-pipeline';
import { ServiceClient } from '@azure/core-client';
import { ServiceClientOptions } from '@azure/core-client';

/**
 * Http Response that is compatible with the core-v1(core-http).
 */
export declare interface CompatResponse extends Omit<FullOperationResponse, "request" | "headers"> {
    /**
     * A description of a HTTP request to be made to a remote server.
     */
    request: WebResourceLike;
    /**
     * A collection of HTTP header key/value pairs.
     */
    headers: HttpHeadersLike;
}

/**
 * Converts a RequestPolicy based HttpClient to a PipelineRequest based HttpClient.
 * @param requestPolicyClient - A HttpClient compatible with core-http
 * @returns A HttpClient compatible with core-rest-pipeline
 */
export declare function convertHttpClient(requestPolicyClient: RequestPolicy): HttpClient;

/**
 * A policy that wraps policies written for core-http.
 * @param factories - An array of `RequestPolicyFactory` objects from a core-http pipeline
 */
export declare function createRequestPolicyFactoryPolicy(factories: RequestPolicyFactory[]): PipelinePolicy;

export declare const disableKeepAlivePolicyName = "DisableKeepAlivePolicy";

/**
 * Options specific to Shim Clients.
 */
export declare interface ExtendedClientOptions {
    /**
     * Options to disable keep alive.
     */
    keepAliveOptions?: KeepAliveOptions;
    /**
     * Options to redirect requests.
     */
    redirectOptions?: RedirectOptions;
}

/**
 * The common set of options that custom shim clients are expected to expose.
 */
export declare type ExtendedCommonClientOptions = CommonClientOptions & ExtendedClientOptions;

/**
 * Client to provide compatability between core V1 & V2.
 */
export declare class ExtendedServiceClient extends ServiceClient {
    constructor(options: ExtendedServiceClientOptions);
    /**
     * Compatible send operation request function.
     *
     * @param operationArguments - Operation arguments
     * @param operationSpec - Operation Spec
     * @returns
     */
    sendOperationRequest<T>(operationArguments: OperationArguments, operationSpec: OperationSpec): Promise<T>;
}

/**
 * Options that shim clients are expected to expose.
 */
export declare type ExtendedServiceClientOptions = ServiceClientOptions & ExtendedClientOptions;

/**
 * An individual header within a HttpHeaders collection.
 */
export declare interface HttpHeader {
    /**
     * The name of the header.
     */
    name: string;
    /**
     * The value of the header.
     */
    value: string;
}

/**
 * A collection of HTTP header key/value pairs.
 */
export declare interface HttpHeadersLike {
    /**
     * Set a header in this collection with the provided name and value. The name is
     * case-insensitive.
     * @param headerName - The name of the header to set. This value is case-insensitive.
     * @param headerValue - The value of the header to set.
     */
    set(headerName: string, headerValue: string | number): void;
    /**
     * Get the header value for the provided header name, or undefined if no header exists in this
     * collection with the provided name.
     * @param headerName - The name of the header.
     */
    get(headerName: string): string | undefined;
    /**
     * Get whether or not this header collection contains a header entry for the provided header name.
     */
    contains(headerName: string): boolean;
    /**
     * Remove the header with the provided headerName. Return whether or not the header existed and
     * was removed.
     * @param headerName - The name of the header to remove.
     */
    remove(headerName: string): boolean;
    /**
     * Get the headers that are contained this collection as an object.
     */
    rawHeaders(): RawHttpHeaders;
    /**
     * Get the headers that are contained in this collection as an array.
     */
    headersArray(): HttpHeader[];
    /**
     * Get the header names that are contained in this collection.
     */
    headerNames(): string[];
    /**
     * Get the header values that are contained in this collection.
     */
    headerValues(): string[];
    /**
     * Create a deep clone/copy of this HttpHeaders collection.
     */
    clone(): HttpHeadersLike;
    /**
     * Get the JSON object representation of this HTTP header collection.
     * The result is the same as `rawHeaders()`.
     */
    toJson(options?: {
        preserveCase?: boolean;
    }): RawHttpHeaders;
}

/**
 * An enum for compatibility with RequestPolicy
 */
export declare enum HttpPipelineLogLevel {
    ERROR = 1,
    INFO = 3,
    OFF = 0,
    WARNING = 2
}

/**
 * Keep Alive Options for how HTTP connections.
 */
export declare interface KeepAliveOptions {
    /**
     * When true, connections will be kept alive for multiple requests.
     * Defaults to true.
     */
    enable?: boolean;
}

/**
 * A HttpHeaders collection represented as a simple JSON object.
 */
export declare type RawHttpHeaders = {
    [headerName: string]: string;
};

/**
 * Options for how redirect responses are handled.
 */
export declare interface RedirectOptions {
    /**
     * When true, redirect responses are followed.  Defaults to true.
     */
    handleRedirects?: boolean;
    /**
     * The maximum number of times the redirect URL will be tried before
     * failing.  Defaults to 20.
     */
    maxRetries?: number;
}

/**
 * A compatible interface for core-http request policies
 */
export declare interface RequestPolicy {
    sendRequest(httpRequest: WebResourceLike): Promise<CompatResponse>;
}

/**
 * An interface for compatibility with core-http's RequestPolicyFactory
 */
export declare interface RequestPolicyFactory {
    create(nextPolicy: RequestPolicy, options: RequestPolicyOptionsLike): RequestPolicy;
}

/**
 * The name of the RequestPolicyFactoryPolicy
 */
export declare const requestPolicyFactoryPolicyName = "RequestPolicyFactoryPolicy";

/**
 * An interface for compatibility with RequestPolicy
 */
export declare interface RequestPolicyOptionsLike {
    log(logLevel: HttpPipelineLogLevel, message: string): void;
    shouldLog(logLevel: HttpPipelineLogLevel): boolean;
}

/**
 * Converts HttpHeaders from core-rest-pipeline to look like
 * HttpHeaders from core-http.
 * @param headers - HttpHeaders from core-rest-pipeline
 * @returns HttpHeaders as they looked in core-http
 */
export declare function toHttpHeadersLike(headers: HttpHeaders): HttpHeadersLike;

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
 * A description of a HTTP request to be made to a remote server.
 */
export declare interface WebResourceLike {
    /**
     * The URL being accessed by the request.
     */
    url: string;
    /**
     * The HTTP method to use when making the request.
     */
    method: HttpMethods;
    /**
     * The HTTP body contents of the request.
     */
    body?: any;
    /**
     * The HTTP headers to use when making the request.
     */
    headers: HttpHeadersLike;
    /**
     * Whether or not the body of the HttpOperationResponse should be treated as a stream.
     * @deprecated Use streamResponseStatusCodes property instead.
     */
    streamResponseBody?: boolean;
    /**
     * A list of response status codes whose corresponding HttpOperationResponse body should be treated as a stream.
     */
    streamResponseStatusCodes?: Set<number>;
    /**
     * Form data, used to build the request body.
     */
    formData?: any;
    /**
     * A query string represented as an object.
     */
    query?: {
        [key: string]: any;
    };
    /**
     * If credentials (cookies) should be sent along during an XHR.
     */
    withCredentials: boolean;
    /**
     * The number of milliseconds a request can take before automatically being terminated.
     * If the request is terminated, an `AbortError` is thrown.
     */
    timeout: number;
    /**
     * Proxy configuration.
     */
    proxySettings?: ProxySettings;
    /**
     * If the connection should be reused.
     */
    keepAlive?: boolean;
    /**
     * Whether or not to decompress response according to Accept-Encoding header (node-fetch only)
     */
    decompressResponse?: boolean;
    /**
     * A unique identifier for the request. Used for logging and tracing.
     */
    requestId: string;
    /**
     * Signal of an abort controller. Can be used to abort both sending a network request and waiting for a response.
     */
    abortSignal?: AbortSignalLike;
    /**
     * Callback which fires upon upload progress.
     */
    onUploadProgress?: (progress: TransferProgressEvent) => void;
    /** Callback which fires upon download progress. */
    onDownloadProgress?: (progress: TransferProgressEvent) => void;
    /**
     * Clone this request object.
     */
    clone(): WebResourceLike;
    /**
     * Validates that the required properties such as method, url, headers["Content-Type"],
     * headers["accept-language"] are defined. It will throw an error if one of the above
     * mentioned properties are not defined.
     * Note: this a no-op for compat purposes.
     */
    validateRequestProperties(): void;
    /**
     * This is a no-op for compat purposes and will throw if called.
     */
    prepare(options: unknown): WebResourceLike;
}

export { }
