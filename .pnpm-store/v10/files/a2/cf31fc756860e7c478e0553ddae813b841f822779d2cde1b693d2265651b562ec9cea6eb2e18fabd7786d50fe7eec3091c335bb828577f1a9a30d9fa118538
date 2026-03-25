import { Agent } from 'http';
import { GaxiosOptions, GaxiosOptionsPrepared, GaxiosPromise, GaxiosResponse } from './common.js';
import { GaxiosInterceptorManager } from './interceptor.js';
/**
 * An interface for enforcing `fetch`-type compliance.
 *
 * @remarks
 *
 * This provides type guarantees during build-time, ensuring the `fetch` method is 1:1
 * compatible with the `fetch` API.
 */
interface FetchCompliance {
    fetch: typeof fetch;
}
export declare class Gaxios implements FetchCompliance {
    #private;
    protected agentCache: Map<string | URL, Agent | ((parsedUrl: URL) => Agent)>;
    /**
     * Default HTTP options that will be used for every HTTP request.
     */
    defaults: GaxiosOptions;
    /**
     * Interceptors
     */
    interceptors: {
        request: GaxiosInterceptorManager<GaxiosOptionsPrepared>;
        response: GaxiosInterceptorManager<GaxiosResponse>;
    };
    /**
     * The Gaxios class is responsible for making HTTP requests.
     * @param defaults The default set of options to be used for this instance.
     */
    constructor(defaults?: GaxiosOptions);
    /**
     * A {@link fetch `fetch`} compliant API for {@link Gaxios}.
     *
     * @remarks
     *
     * This is useful as a drop-in replacement for `fetch` API usage.
     *
     * @example
     *
     * ```ts
     * const gaxios = new Gaxios();
     * const myFetch: typeof fetch = (...args) => gaxios.fetch(...args);
     * await myFetch('https://example.com');
     * ```
     *
     * @param args `fetch` API or `Gaxios#request` parameters
     * @returns the {@link Response} with Gaxios-added properties
     */
    fetch<T = unknown>(...args: Parameters<typeof fetch> | Parameters<Gaxios['request']>): GaxiosPromise<T>;
    /**
     * Perform an HTTP request with the given options.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    request<T = ReturnType<JSON['parse']>>(opts?: GaxiosOptions): GaxiosPromise<T>;
    private _defaultAdapter;
    /**
     * Internal, retryable version of the `request` method.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    protected _request<T = ReturnType<JSON['parse']>>(opts: GaxiosOptionsPrepared): GaxiosPromise<T>;
    private getResponseData;
    /**
     * By default, throw for any non-2xx status code
     * @param status status code from the HTTP response
     */
    private validateStatus;
    /**
     * Attempts to parse a response by looking at the Content-Type header.
     * @param {Response} response the HTTP response.
     * @returns a promise that resolves to the response data.
     */
    private getResponseDataFromContentType;
    /**
     * Creates an async generator that yields the pieces of a multipart/related request body.
     * This implementation follows the spec: https://www.ietf.org/rfc/rfc2387.txt. However, recursive
     * multipart/related requests are not currently supported.
     *
     * @param {GaxiosMultipartOptions[]} multipartOptions the pieces to turn into a multipart/related body.
     * @param {string} boundary the boundary string to be placed between each part.
     */
    private getMultipartRequest;
    /**
     * Merges headers.
     * If the base headers do not exist a new `Headers` object will be returned.
     *
     * @remarks
     *
     * Using this utility can be helpful when the headers are not known to exist:
     * - if they exist as `Headers`, that instance will be used
     *   - it improves performance and allows users to use their existing references to their `Headers`
     * - if they exist in another form (`HeadersInit`), they will be used to create a new `Headers` object
     * - if the base headers do not exist a new `Headers` object will be created
     *
     * @param base headers to append/overwrite to
     * @param append headers to append/overwrite with
     * @returns the base headers instance with merged `Headers`
     */
    static mergeHeaders(base?: HeadersInit, ...append: HeadersInit[]): Headers;
}
type HeadersInit = ConstructorParameters<typeof Headers>[0];
export {};
