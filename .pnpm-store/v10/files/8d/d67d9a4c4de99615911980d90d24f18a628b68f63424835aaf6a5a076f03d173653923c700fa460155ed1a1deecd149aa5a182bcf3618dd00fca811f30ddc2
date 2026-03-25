/**
 * This module provides ways to instrument k6 scripts HTTP calls with tracing information.
 *
 * It most notably exposes an `instrumentHTTP` function that can be used to wrap the `http` module's
 * function calls with tracing information. It also exposes a `Client` class that can be used to
 * instrument HTTP calls in a more fine-grained way.
 *
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/tracing/
 */

import { RefinedParams, RefinedResponse, RequestBody, ResponseType } from "../http";

/**
 * The instrumentHTTP function instruments the k6 http module
 * with tracing capabilities. It will transparently replace each
 * of the k6 http module functions with its instrumented
 * counterpart, in place.
 *
 * instrumentHTTP can only be called in the init context of the script.
 *
 * @param options - The options to use when instrumenting the http module.
 */
export function instrumentHTTP(options: Options): void;

/**
 * Client is an HTTP client class that attaches tracing information
 * to its requests.
 *
 * It lets users include a tracing context in their HTTP requests
 * so that tracing backends (such as Grafana Tempo) can incorporate
 * their results.
 *
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/tracing/client/
 */
export class Client {
    protected __brand: never;

    /**
     * Instantiates a new tracing Client.
     *
     * @param options - The options to use for this Client.
     */
    constructor(options: Options);

    /**
     * Performs a DELETE request instrumented with trace context
     * headers.
     *
     * @param url - Request URL.
     * @param body - Discouraged. Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    del<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Performs a HEAD request instrumented with trace context headers.
     *
     * @param url - Request URL.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    head<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Performs a GET request instrumented with trace context headers.
     *
     * @param url - Request URL.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    get<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Performs an OPTIONS request instrumented with trace context headers.
     *
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    options<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Performs a PATCH request instrumented with trace context headers.
     *
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    patch<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Performs a POST request instrumented with trace context headers.
     *
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    post<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Performs a PUT request instrumented with trace context headers.
     *
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    put<RT extends ResponseType | undefined>(
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * Performs a HTTP request instrumented with trace context headers.
     *
     * @param method - HTTP method.
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    request<RT extends ResponseType | undefined>(
        method: string,
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): RefinedResponse<RT>;

    /**
     * The asyncRequest method starts the process of performing a HTTP request
     * asynchronously, returning a promise which is fulfilled once the response
     * is available. The performed request is instrumented with trace context
     * headers.
     *
     * @param method - HTTP method.
     * @param url - Request URL.
     * @param body - Request body. Object form encoded.
     * @param params - Request parameters.
     * @returns Resulting response.
     */
    asyncRequest<RT extends ResponseType | undefined>(
        method: string,
        url: string | HttpURL,
        body?: RequestBody | null,
        params?: RefinedParams<RT> | null,
    ): Promise<RefinedResponse<RT>>;
}

/**
 * The Options object allows configuring the tracing instrumentation behavior.
 *
 * https://grafana.com/docs/k6/latest/javascript-api/k6-experimental/tracing/options/
 */
export interface Options {
    /**
     * The trace context propagation format.
     *
     * Currently supported: `w3c` and `jaeger`.
     *
     * Defaults to `w3c`.
     */
    propagator: "w3c" | "jaeger";

    /**
     * The probability of each request having
     * its `sampled` flag set to true.
     * Its value should be within the `0 <= n <= 100` bounds.
     *
     * Defaults to `100`.
     */
    sampling?: number;
}

/**
 * Returned value from http.url method.
 */
export interface HttpURL {
    __brand: "http-url";
}
