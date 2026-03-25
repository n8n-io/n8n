                              
                              
import { Stream } from "./lib/streaming.js";
import { APIError } from "./error.js";
import { type Readable, type Agent, type RequestInfo, type RequestInit, type Response, type HeadersInit } from "./_shims/index.js";
export { type Response };
import { BlobLike } from "./uploads.js";
export { maybeMultipartFormRequestOptions, multipartFormRequestOptions, createForm, type Uploadable, } from "./uploads.js";
export type Fetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;
type PromiseOrValue<T> = T | Promise<T>;
type APIResponseProps = {
    response: Response;
    options: FinalRequestOptions;
    controller: AbortController;
};
/**
 * A subclass of `Promise` providing additional helper methods
 * for interacting with the SDK.
 */
export declare class APIPromise<T> extends Promise<T> {
    private responsePromise;
    private parseResponse;
    private parsedPromise;
    constructor(responsePromise: Promise<APIResponseProps>, parseResponse?: (props: APIResponseProps) => PromiseOrValue<T>);
    _thenUnwrap<U>(transform: (data: T, props: APIResponseProps) => U): APIPromise<U>;
    /**
     * Gets the raw `Response` instance instead of parsing the response
     * data.
     *
     * If you want to parse the response body but still get the `Response`
     * instance, you can use {@link withResponse()}.
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` if you can,
     * or add one of these imports before your first `import … from 'groq-sdk'`:
     * - `import 'groq-sdk/shims/node'` (if you're running on Node)
     * - `import 'groq-sdk/shims/web'` (otherwise)
     */
    asResponse(): Promise<Response>;
    /**
     * Gets the parsed response data and the raw `Response` instance.
     *
     * If you just want to get the raw `Response` instance without parsing it,
     * you can use {@link asResponse()}.
     *
     *
     * 👋 Getting the wrong TypeScript type for `Response`?
     * Try setting `"moduleResolution": "NodeNext"` if you can,
     * or add one of these imports before your first `import … from 'groq-sdk'`:
     * - `import 'groq-sdk/shims/node'` (if you're running on Node)
     * - `import 'groq-sdk/shims/web'` (otherwise)
     */
    withResponse(): Promise<{
        data: T;
        response: Response;
    }>;
    private parse;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
export declare abstract class APIClient {
    baseURL: string;
    maxRetries: number;
    timeout: number;
    httpAgent: Agent | undefined;
    private fetch;
    protected idempotencyHeader?: string;
    constructor({ baseURL, maxRetries, timeout, // 1 minute
    httpAgent, fetch: overriddenFetch, }: {
        baseURL: string;
        maxRetries?: number | undefined;
        timeout: number | undefined;
        httpAgent: Agent | undefined;
        fetch: Fetch | undefined;
    });
    protected authHeaders(opts: FinalRequestOptions): Headers;
    /**
     * Override this to add your own default headers, for example:
     *
     *  {
     *    ...super.defaultHeaders(),
     *    Authorization: 'Bearer 123',
     *  }
     */
    protected defaultHeaders(opts: FinalRequestOptions): Headers;
    protected abstract defaultQuery(): DefaultQuery | undefined;
    /**
     * Override this to add your own headers validation:
     */
    protected validateHeaders(headers: Headers, customHeaders: Headers): void;
    protected defaultIdempotencyKey(): string;
    get<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp>;
    post<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp>;
    patch<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp>;
    put<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp>;
    delete<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp>;
    private methodRequest;
    getAPIList<Item, PageClass extends AbstractPage<Item> = AbstractPage<Item>>(path: string, Page: new (...args: any[]) => PageClass, opts?: RequestOptions<any>): PagePromise<PageClass, Item>;
    private calculateContentLength;
    buildRequest<Req>(options: FinalRequestOptions<Req>, { retryCount }?: {
        retryCount?: number;
    }): {
        req: RequestInit;
        url: string;
        timeout: number;
    };
    private buildHeaders;
    /**
     * Used as a callback for mutating the given `FinalRequestOptions` object.
     */
    protected prepareOptions(options: FinalRequestOptions): Promise<void>;
    /**
     * Used as a callback for mutating the given `RequestInit` object.
     *
     * This is useful for cases where you want to add certain headers based off of
     * the request properties, e.g. `method` or `url`.
     */
    protected prepareRequest(request: RequestInit, { url, options }: {
        url: string;
        options: FinalRequestOptions;
    }): Promise<void>;
    protected parseHeaders(headers: HeadersInit | null | undefined): Record<string, string>;
    protected makeStatusError(status: number | undefined, error: Object | undefined, message: string | undefined, headers: Headers | undefined): APIError;
    request<Req, Rsp>(options: PromiseOrValue<FinalRequestOptions<Req>>, remainingRetries?: number | null): APIPromise<Rsp>;
    private makeRequest;
    requestAPIList<Item = unknown, PageClass extends AbstractPage<Item> = AbstractPage<Item>>(Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass, options: FinalRequestOptions): PagePromise<PageClass, Item>;
    buildURL<Req>(path: string, query: Req | null | undefined): string;
    protected stringifyQuery(query: Record<string, unknown>): string;
    fetchWithTimeout(url: RequestInfo, init: RequestInit | undefined, ms: number, controller: AbortController): Promise<Response>;
    private shouldRetry;
    private retryRequest;
    private calculateDefaultRetryTimeoutMillis;
    private getUserAgent;
}
export type PageInfo = {
    url: URL;
} | {
    params: Record<string, unknown> | null;
};
export declare abstract class AbstractPage<Item> implements AsyncIterable<Item> {
    #private;
    protected options: FinalRequestOptions;
    protected response: Response;
    protected body: unknown;
    constructor(client: APIClient, response: Response, body: unknown, options: FinalRequestOptions);
    /**
     * @deprecated Use nextPageInfo instead
     */
    abstract nextPageParams(): Partial<Record<string, unknown>> | null;
    abstract nextPageInfo(): PageInfo | null;
    abstract getPaginatedItems(): Item[];
    hasNextPage(): boolean;
    getNextPage(): Promise<this>;
    iterPages(): AsyncGenerator<this>;
    [Symbol.asyncIterator](): AsyncGenerator<Item>;
}
/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
export declare class PagePromise<PageClass extends AbstractPage<Item>, Item = ReturnType<PageClass['getPaginatedItems']>[number]> extends APIPromise<PageClass> implements AsyncIterable<Item> {
    constructor(client: APIClient, request: Promise<APIResponseProps>, Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass);
    /**
     * Allow auto-paginating iteration on an unawaited list call, eg:
     *
     *    for await (const item of client.items.list()) {
     *      console.log(item)
     *    }
     */
    [Symbol.asyncIterator](): AsyncGenerator<Item>;
}
export declare const createResponseHeaders: (headers: Awaited<ReturnType<Fetch>>['headers']) => Record<string, string>;
type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
export type RequestClient = {
    fetch: Fetch;
};
export type Headers = Record<string, string | null | undefined>;
export type DefaultQuery = Record<string, string | undefined>;
export type KeysEnum<T> = {
    [P in keyof Required<T>]: true;
};
export type RequestOptions<Req = unknown | Record<string, unknown> | Readable | BlobLike | ArrayBufferView | ArrayBuffer> = {
    method?: HTTPMethod;
    path?: string;
    query?: Req | undefined;
    body?: Req | null | undefined;
    headers?: Headers | undefined;
    maxRetries?: number;
    stream?: boolean | undefined;
    timeout?: number;
    httpAgent?: Agent;
    signal?: AbortSignal | undefined | null;
    idempotencyKey?: string;
    __binaryRequest?: boolean | undefined;
    __binaryResponse?: boolean | undefined;
    __streamClass?: typeof Stream;
};
export declare const isRequestOptions: (obj: unknown) => obj is RequestOptions<unknown>;
export type FinalRequestOptions<Req = unknown | Record<string, unknown> | Readable | DataView> = RequestOptions<Req> & {
    method: HTTPMethod;
    path: string;
};
export declare const safeJSON: (text: string) => any;
export declare const sleep: (ms: number) => Promise<unknown>;
export declare const castToError: (err: any) => Error;
export declare const ensurePresent: <T>(value: T | null | undefined) => T;
/**
 * Read an environment variable.
 *
 * Trims beginning and trailing whitespace.
 *
 * Will return undefined if the environment variable doesn't exist or cannot be accessed.
 */
export declare const readEnv: (env: string) => string | undefined;
export declare const coerceInteger: (value: unknown) => number;
export declare const coerceFloat: (value: unknown) => number;
export declare const coerceBoolean: (value: unknown) => boolean;
export declare const maybeCoerceInteger: (value: unknown) => number | undefined;
export declare const maybeCoerceFloat: (value: unknown) => number | undefined;
export declare const maybeCoerceBoolean: (value: unknown) => boolean | undefined;
export declare function isEmptyObj(obj: Object | null | undefined): boolean;
export declare function hasOwn(obj: Object, key: string): boolean;
export declare function debug(action: string, ...args: any[]): void;
export declare const isRunningInBrowser: () => boolean;
export interface HeadersProtocol {
    get: (header: string) => string | null | undefined;
}
export type HeadersLike = Record<string, string | string[] | undefined> | HeadersProtocol;
export declare const isHeadersProtocol: (headers: any) => headers is HeadersProtocol;
export declare const getRequiredHeader: (headers: HeadersLike | Headers, header: string) => string;
export declare const getHeader: (headers: HeadersLike | Headers, header: string) => string | undefined;
/**
 * Encodes a string to Base64 format.
 */
export declare const toBase64: (str: string | null | undefined) => string;
export declare function isObj(obj: unknown): obj is Record<string, unknown>;
//# sourceMappingURL=core.d.ts.map