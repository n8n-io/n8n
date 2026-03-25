export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Awaitable<T> = T | Promise<T>;
export type RequestInput = {
    /**
     * The URL the request will use.
     */
    url: URL;
    /**
     * Options used to create a [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request).
     */
    options?: RequestInit | undefined;
};
export interface HTTPClientOptions {
    fetcher?: Fetcher;
}
export type BeforeRequestHook = (req: Request) => Awaitable<Request | void>;
export type RequestErrorHook = (err: unknown, req: Request) => Awaitable<void>;
export type ResponseHook = (res: Response, req: Request) => Awaitable<void>;
export declare class HTTPClient {
    private options;
    private fetcher;
    private requestHooks;
    private requestErrorHooks;
    private responseHooks;
    constructor(options?: HTTPClientOptions);
    request(request: Request): Promise<Response>;
    /**
     * Registers a hook that is called before a request is made. The hook function
     * can mutate the request or return a new request. This may be useful to add
     * additional information to request such as request IDs and tracing headers.
     */
    addHook(hook: "beforeRequest", fn: BeforeRequestHook): this;
    /**
     * Registers a hook that is called when a request cannot be made due to a
     * network error.
     */
    addHook(hook: "requestError", fn: RequestErrorHook): this;
    /**
     * Registers a hook that is called when a response has been received from the
     * server.
     */
    addHook(hook: "response", fn: ResponseHook): this;
    /** Removes a hook that was previously registered with `addHook`. */
    removeHook(hook: "beforeRequest", fn: BeforeRequestHook): this;
    /** Removes a hook that was previously registered with `addHook`. */
    removeHook(hook: "requestError", fn: RequestErrorHook): this;
    /** Removes a hook that was previously registered with `addHook`. */
    removeHook(hook: "response", fn: ResponseHook): this;
    clone(): HTTPClient;
}
export type StatusCodePredicate = number | string | (number | string)[];
export declare function matchContentType(response: Response, pattern: string): boolean;
export declare function matchStatusCode(response: Response, codes: StatusCodePredicate): boolean;
export declare function matchResponse(response: Response, code: StatusCodePredicate, contentTypePattern: string): boolean;
/**
 * Uses various heurisitics to determine if an error is a connection error.
 */
export declare function isConnectionError(err: unknown): boolean;
/**
 * Uses various heurisitics to determine if an error is a timeout error.
 */
export declare function isTimeoutError(err: unknown): boolean;
/**
 * Uses various heurisitics to determine if an error is a abort error.
 */
export declare function isAbortError(err: unknown): boolean;
//# sourceMappingURL=http.d.ts.map