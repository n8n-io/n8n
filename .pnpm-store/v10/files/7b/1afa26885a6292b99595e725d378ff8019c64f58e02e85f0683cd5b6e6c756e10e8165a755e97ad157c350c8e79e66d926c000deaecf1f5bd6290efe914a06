import { RequestParams, Headers, Body, Auth, Hash, ParameterEncoderFn, Params } from './types.mjs';

type RequestContext = Record<string, unknown>;
/**
 * Removes the object type without removing Record types in the union
 */
type ExcludeObject<T> = T extends object ? (object extends T ? never : T) : T;
/**
 * @typedef Request
 * @param {MethodDescriptor} methodDescriptor
 * @param {RequestParams} requestParams, defaults to an empty object ({})
 * @param {RequestContext} request context store, defaults to an empty object ({})
 */
declare class Request {
    methodDescriptor: MethodDescriptor;
    requestParams: RequestParams;
    private requestContext;
    constructor(methodDescriptor: MethodDescriptor, requestParams?: RequestParams, requestContext?: RequestContext);
    private isParam;
    params(): RequestParams;
    /**
     * Returns the request context; a key value object.
     * Useful to pass information from upstream middleware to a downstream one.
     */
    context<T extends RequestContext = RequestContext>(): T;
    /**
     * Returns the HTTP method in lowercase
     */
    method(): string;
    /**
     * Returns host name without trailing slash
     * Example: 'http://example.org'
     */
    host(): string;
    /**
     * Returns path with parameters and leading slash.
     * Example: '/some/path?param1=true'
     *
     * @throws {Error} if any dynamic segment is missing.
     * Example:
     *  Imagine the path '/some/{name}', the error will be similar to:
     *    '[Mappersmith] required parameter missing (name), "/some/{name}" cannot be resolved'
     */
    path(): string;
    /**
     * Returns the template path, without params, before interpolation.
     * If path is a function, returns the result of request.path()
     * Example: '/some/{param}/path'
     */
    pathTemplate(): string;
    /**
     * Returns the full URL
     * Example: http://example.org/some/path?param1=true
     *
     */
    url(): string;
    /**
     * Returns an object with the headers. Header names are converted to
     * lowercase
     */
    headers(): Headers;
    /**
     * Utility method to get a header value by name
     */
    header<T extends string | number | boolean>(name: string): T | undefined;
    body(): Body | undefined;
    auth(): Auth | undefined;
    timeout(): number | undefined;
    signal(): AbortSignal | undefined;
    /**
     * Enhances current request returning a new Request
     * @param {RequestParams} extras
     *   @param {Object} extras.auth - it will replace the current auth
     *   @param {String|Object} extras.body - it will replace the current body
     *   @param {Headers} extras.headers - it will be merged with current headers
     *   @param {String} extras.host - it will replace the current timeout
     *   @param {RequestParams} extras.params - it will be merged with current params
     *   @param {Number} extras.timeout - it will replace the current timeout
     * @param {Object} requestContext - Use to pass information between different middleware.
     */
    enhance(extras: RequestParams, requestContext?: RequestContext): Request;
    /**
     * Is the request expecting a binary response?
     */
    isBinary(): boolean;
}

declare const REGEXP_CONTENT_TYPE_JSON: RegExp;
interface ResponseParams {
    readonly status?: number;
    readonly rawData?: string;
    readonly headers?: Headers;
    readonly error?: Error;
}
/**
 * @typedef Response
 * @param {Request} originalRequest, for auth it hides the password
 * @param {Integer} responseStatus
 * @param {String} responseData, defaults to null
 * @param {Object} responseHeaders, defaults to an empty object ({})
 * @param {Array<Error>} errors, defaults to an empty array ([])
 */
type SerializableJSON = number | string | boolean | null | Record<string, unknown>;
type ParsedJSON = SerializableJSON | SerializableJSON[];
declare class Response<DataType extends ParsedJSON = ParsedJSON> {
    readonly originalRequest: Request;
    readonly responseStatus: number;
    readonly responseData: string | null;
    readonly responseHeaders: Headers;
    readonly errors: Array<Error | string>;
    timeElapsed: number | null;
    constructor(originalRequest: Request, responseStatus: number, responseData?: string | null, responseHeaders?: Headers, errors?: Array<Error | string>);
    request(): Request;
    status(): number;
    /**
     * Returns true if status is greater or equal 200 or lower than 400
     */
    success(): boolean;
    /**
     * Returns an object with the headers. Header names are converted to
     * lowercase
     */
    headers(): Hash;
    /**
     * Utility method to get a header value by name
     */
    header<T extends string | number | boolean>(name: string): T | undefined;
    /**
     * Returns the original response data
     */
    rawData(): string | null;
    /**
     * Returns the response data, if "Content-Type" is "application/json"
     * it parses the response and returns an object.
     * Friendly reminder:
     *  - JSON.parse() can return null, an Array or an object.
     */
    data<T = DataType>(): T;
    isContentTypeJSON(): boolean;
    /**
     * Returns the last error instance that caused the request to fail
     */
    error(): Error | null;
    /**
     * Enhances current Response returning a new Response
     *
     * @param {Object} extras
     *   @param {Integer} extras.status - it will replace the current status
     *   @param {String} extras.rawData - it will replace the current rawData
     *   @param {Object} extras.headers - it will be merged with current headers
     *   @param {Error} extras.error    - it will be added to the list of errors
     */
    enhance(extras: ResponseParams): Response<DataType>;
}

/**
 * Automatically configure your requests with basic auth
 *
 * Example:
 * In your manifest:
 * {
 *   middleware: [ BasicAuthMiddleware({ username: 'bob', password: 'bob' }) ]
 * }
 *
 * Making the call:
 * client.User.all()
 * // => header: "Authorization: Basic Ym9iOmJvYg=="
 */
declare const BasicAuthMiddleware: (authConfig: Auth) => Middleware;

interface RetryMiddlewareOptions {
    readonly headerRetryCount: string;
    readonly headerRetryTime: string;
    readonly maxRetryTimeInSecs: number;
    readonly initialRetryTimeInSecs: number;
    readonly factor: number;
    readonly multiplier: number;
    readonly retries: number;
    validateRetry(response: Response): boolean;
}
declare const defaultRetryConfigs: RetryMiddlewareOptions;
type RetryMiddlewareType = Middleware<{
    enableRetry: boolean;
    inboundRequest: Request;
}>;
/**
 * This middleware will automatically retry GET requests up to the configured amount of
 * retries using a randomization function that grows exponentially. The retry count and
 * the time used will be included as a header in the response.
 *
 * The retry time is calculated using the following formula:
 *   retryTime = min(
 *     random(previousRetryTime - randomizedFactor, previousRetryTime + randomizedFactor) * multipler,
 *     maxRetryTime
 *   )
 *
 * Take a look at `calculateExponentialRetryTime` for more information.
 *
 *  @param {Object} retryConfigs
 *   @param {String} retryConfigs.headerRetryCount (default: 'X-Mappersmith-Retry-Count')
 *   @param {String} retryConfigs.headerRetryTime (default: 'X-Mappersmith-Retry-Time')
 *   @param {Number} retryConfigs.maxRetryTimeInSecs (default: 5)
 *   @param {Number} retryConfigs.initialRetryTimeInSecs (default: 1)
 *   @param {Number} retryConfigs.factor (default: 0.2) - randomization factor
 *   @param {Number} retryConfigs.multiplier (default: 2) - exponential factor
 *   @param {Number} retryConfigs.retries (default: 5) - max retries
 */
declare const RetryMiddleware: (customConfigs?: Partial<RetryMiddlewareOptions>) => RetryMiddlewareType;

/**
 * Increases the retry time for each attempt using a randomization function that grows exponentially.
 * The value is limited by `retryConfigs.maxRetryTimeInSecs`.
 * @param {Number} retryTime
 *
 * @return {Number}
 */
declare const calculateExponentialRetryTime: (retryTime: number, retryConfigs: RetryMiddlewareOptions) => number;

/**
 * Sets a request header with the value of a cookie from document.cookie, if it exists
 */
declare const CsrfMiddleware: (cookieName?: string, headerName?: string) => Middleware;

/**
 * Adds started_at, ended_at and duration headers to the response
 */
declare const DurationMiddleware: Middleware;

declare const CONTENT_TYPE_JSON = "application/json;charset=utf-8";
/**
 * Automatically encode your objects into JSON
 *
 * Example:
 * client.User.all({ body: { name: 'bob' } })
 * // => body: {"name":"bob"}
 * // => header: "Content-Type=application/json;charset=utf-8"
 */
declare const EncodeJsonMiddleware: Middleware;

type ErrorHandlerMiddlewareCallback = (response: Response) => boolean;
declare const setErrorHandler: (errorHandler: ErrorHandlerMiddlewareCallback) => void;
/**
 * Provides a catch-all function for all requests. If the catch-all
 * function returns `true` it prevents the original promise to continue.
 */
declare const GlobalErrorHandlerMiddleware: Middleware;

declare const defaultSuccessLogger: (message: string) => void;
declare const defaultErrorLogger: (message: string) => void;
declare const setSuccessLogger: (logger: (message: string) => void) => void;
declare const setErrorLogger: (logger: (message: string) => void) => void;
declare const setLoggerEnabled: (value: boolean) => void;
/**
 * Log all requests and responses.
 */
declare const LogMiddleware: Middleware;

type Milliseconds = number;
/**
 * Automatically configure your requests with a default timeout
 *
 * Example:
 * In your manifest:
 * {
 *   middleware: [ TimeoutMiddleware(500) ]
 * }
 *
 * You can still override the default value:
 * client.User.all({ timeout: 100 })
 */
declare const TimeoutMiddleware: (timeoutValue: Milliseconds) => Middleware;

type Context = object;
type RequestGetter = () => Promise<Request>;
type ResponseGetter = () => Promise<Response>;
type AbortFn = (error: Error) => void;
type RenewFn = () => Promise<Response>;
interface MiddlewareDescriptor {
    __name?: string;
    /**
     * @deprecated: Use prepareRequest
     */
    request?(request: Request): Promise<Request> | Request;
    /**
     * Allows a middleware to tap into the prepare request phase
     */
    prepareRequest(
    /**
     * This function must return a `Promise` resolving the `Request`.
     *
     * The method `enhance` can be used to generate a new request based on the previous one.
     */
    next: RequestGetter, 
    /**
     * Function that can be used to abort the middleware execution early on and throw a custom error to the user.
     */
    abort: AbortFn): Promise<Request | void>;
    /**
     * Allows a middleware to tap into the response phase
     */
    response(
    /**
     * This function must return a `Promise` resolving the `Response`.
     *
     * The method `enhance` can be used to generate a new response based on the previous one.
     */
    next: ResponseGetter, 
    /**
     * Function that is used to rerun the middleware stack.
     *
     * Useful for example when automatically refreshing an expired access token.
     */
    renew: RenewFn, 
    /**
     * The final request object (after the whole middleware chain has prepared and all `prepareRequest` been executed).
     *
     * Useful for example when you want to get access to the request without invoking `next`
     */
    request: Request): Promise<Response>;
}
interface MiddlewareParams {
    readonly clientId: string | null;
    readonly context: Context;
    readonly resourceMethod: string;
    readonly resourceName: string;
    readonly mockRequest?: boolean;
}
type DefaultPrivateProps = {};
/**
 * Mappersmith middleware, used to describe a factory function that given MiddlewareParams
 * returns a middleware object (partial of MiddlewareDescriptor).
 *
 * If the middleware needs to save local state you can use PrivateProps to allow it.
 */
type Middleware<PrivateProps extends Record<string, unknown> = DefaultPrivateProps> = (params: MiddlewareParams) => Partial<MiddlewareDescriptor & PrivateProps>;

interface MethodDescriptorParams {
    allowResourceHostOverride?: boolean;
    authAttr?: string;
    binary?: boolean;
    bodyAttr?: string;
    headers?: Headers;
    headersAttr?: string;
    host: string;
    hostAttr?: string;
    method?: string;
    middleware?: Array<Middleware>;
    middlewares?: Array<Middleware>;
    parameterEncoder?: ParameterEncoderFn;
    params?: Params;
    path: string | ((args: RequestParams) => string);
    pathAttr?: string;
    queryParamAlias?: Record<string, string>;
    signalAttr?: string;
    timeoutAttr?: string;
}
/**
 * @typedef MethodDescriptor
 * @param {MethodDescriptorParams} params
 *   @param {boolean} params.allowResourceHostOverride
 *   @param {Function} params.parameterEncoder
 *   @param {String} params.authAttr - auth attribute name. Default: 'auth'
 *   @param {boolean} params.binary
 *   @param {String} params.bodyAttr - body attribute name. Default: 'body'
 *   @param {Headers} params.headers
 *   @param {String} params.headersAttr - headers attribute name. Default: 'headers'
 *   @param {String} params.host
 *   @param {String} params.hostAttr - host attribute name. Default: 'host'
 *   @param {String} params.method
 *   @param {Middleware[]} params.middleware
 *   @param {Middleware[]} params.middlewares - alias for middleware
 *   @param {RequestParams} params.params
 *   @param {String|Function} params.path
 *   @param {String} params.pathAttr. Default: 'path'
 *   @param {Object} params.queryParamAlias
 *   @param {Number} params.signalAttr - signal attribute name. Default: 'signal'
 *   @param {Number} params.timeoutAttr - timeout attribute name. Default: 'timeout'
 */
declare class MethodDescriptor {
    readonly allowResourceHostOverride: boolean;
    readonly authAttr: string;
    readonly binary: boolean;
    readonly bodyAttr: string;
    readonly headers?: Headers;
    readonly headersAttr: string;
    readonly host: string;
    readonly hostAttr: string;
    readonly method: string;
    readonly middleware: Middleware[];
    readonly parameterEncoder: ParameterEncoderFn;
    readonly params?: RequestParams;
    readonly path: string | ((args: RequestParams) => string);
    readonly pathAttr: string;
    readonly queryParamAlias: Record<string, string>;
    readonly signalAttr: string;
    readonly timeoutAttr: string;
    constructor(params: MethodDescriptorParams);
}

export { type AbortFn as A, BasicAuthMiddleware as B, type Context as C, DurationMiddleware as D, type ExcludeObject as E, GlobalErrorHandlerMiddleware as G, LogMiddleware as L, type Middleware as M, type ParsedJSON as P, Request as R, TimeoutMiddleware as T, type RequestContext as a, Response as b, type MiddlewareDescriptor as c, type MiddlewareParams as d, type RenewFn as e, type RequestGetter as f, type ResponseGetter as g, MethodDescriptor as h, type MethodDescriptorParams as i, type RetryMiddlewareOptions as j, REGEXP_CONTENT_TYPE_JSON as k, type ResponseParams as l, RetryMiddleware as m, defaultRetryConfigs as n, calculateExponentialRetryTime as o, CsrfMiddleware as p, EncodeJsonMiddleware as q, CONTENT_TYPE_JSON as r, type ErrorHandlerMiddlewareCallback as s, setErrorHandler as t, defaultSuccessLogger as u, defaultErrorLogger as v, setSuccessLogger as w, setErrorLogger as x, setLoggerEnabled as y, type Milliseconds as z };
