/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as http from 'http';
import * as ifm from './interfaces';
import { ProxyAgent } from 'undici';
export declare enum HttpCodes {
    OK = 200,
    MultipleChoices = 300,
    MovedPermanently = 301,
    ResourceMoved = 302,
    SeeOther = 303,
    NotModified = 304,
    UseProxy = 305,
    SwitchProxy = 306,
    TemporaryRedirect = 307,
    PermanentRedirect = 308,
    BadRequest = 400,
    Unauthorized = 401,
    PaymentRequired = 402,
    Forbidden = 403,
    NotFound = 404,
    MethodNotAllowed = 405,
    NotAcceptable = 406,
    ProxyAuthenticationRequired = 407,
    RequestTimeout = 408,
    Conflict = 409,
    Gone = 410,
    TooManyRequests = 429,
    InternalServerError = 500,
    NotImplemented = 501,
    BadGateway = 502,
    ServiceUnavailable = 503,
    GatewayTimeout = 504
}
export declare enum Headers {
    Accept = "accept",
    ContentType = "content-type"
}
export declare enum MediaTypes {
    ApplicationJson = "application/json"
}
/**
 * Returns the proxy URL, depending upon the supplied url and proxy environment variables.
 * @param serverUrl  The server URL where the request will be sent. For example, https://api.github.com
 */
export declare function getProxyUrl(serverUrl: string): string;
export declare class HttpClientError extends Error {
    constructor(message: string, statusCode: number);
    statusCode: number;
    result?: any;
}
export declare class HttpClientResponse {
    constructor(message: http.IncomingMessage);
    message: http.IncomingMessage;
    readBody(): Promise<string>;
    readBodyBuffer?(): Promise<Buffer>;
}
export declare function isHttps(requestUrl: string): boolean;
export declare class HttpClient {
    userAgent: string | undefined;
    handlers: ifm.RequestHandler[];
    requestOptions: ifm.RequestOptions | undefined;
    private _ignoreSslError;
    private _socketTimeout;
    private _allowRedirects;
    private _allowRedirectDowngrade;
    private _maxRedirects;
    private _allowRetries;
    private _maxRetries;
    private _agent;
    private _proxyAgent;
    private _proxyAgentDispatcher;
    private _keepAlive;
    private _disposed;
    constructor(userAgent?: string, handlers?: ifm.RequestHandler[], requestOptions?: ifm.RequestOptions);
    options(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    get(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    del(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    post(requestUrl: string, data: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    patch(requestUrl: string, data: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    put(requestUrl: string, data: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    head(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    sendStream(verb: string, requestUrl: string, stream: NodeJS.ReadableStream, additionalHeaders?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    /**
     * Gets a typed object from an endpoint
     * Be aware that not found returns a null.  Other errors (4xx, 5xx) reject the promise
     */
    getJson<T>(requestUrl: string, additionalHeaders?: http.OutgoingHttpHeaders): Promise<ifm.TypedResponse<T>>;
    postJson<T>(requestUrl: string, obj: any, additionalHeaders?: http.OutgoingHttpHeaders): Promise<ifm.TypedResponse<T>>;
    putJson<T>(requestUrl: string, obj: any, additionalHeaders?: http.OutgoingHttpHeaders): Promise<ifm.TypedResponse<T>>;
    patchJson<T>(requestUrl: string, obj: any, additionalHeaders?: http.OutgoingHttpHeaders): Promise<ifm.TypedResponse<T>>;
    /**
     * Makes a raw http request.
     * All other methods such as get, post, patch, and request ultimately call this.
     * Prefer get, del, post and patch
     */
    request(verb: string, requestUrl: string, data: string | NodeJS.ReadableStream | null, headers?: http.OutgoingHttpHeaders): Promise<HttpClientResponse>;
    /**
     * Needs to be called if keepAlive is set to true in request options.
     */
    dispose(): void;
    /**
     * Raw request.
     * @param info
     * @param data
     */
    requestRaw(info: ifm.RequestInfo, data: string | NodeJS.ReadableStream | null): Promise<HttpClientResponse>;
    /**
     * Raw request with callback.
     * @param info
     * @param data
     * @param onResult
     */
    requestRawWithCallback(info: ifm.RequestInfo, data: string | NodeJS.ReadableStream | null, onResult: (err?: Error, res?: HttpClientResponse) => void): void;
    /**
     * Gets an http agent. This function is useful when you need an http agent that handles
     * routing through a proxy server - depending upon the url and proxy environment variables.
     * @param serverUrl  The server URL where the request will be sent. For example, https://api.github.com
     */
    getAgent(serverUrl: string): http.Agent;
    getAgentDispatcher(serverUrl: string): ProxyAgent | undefined;
    private _prepareRequest;
    private _mergeHeaders;
    private _getExistingOrDefaultHeader;
    private _getAgent;
    private _getProxyAgentDispatcher;
    private _performExponentialBackoff;
    private _processResponse;
}
