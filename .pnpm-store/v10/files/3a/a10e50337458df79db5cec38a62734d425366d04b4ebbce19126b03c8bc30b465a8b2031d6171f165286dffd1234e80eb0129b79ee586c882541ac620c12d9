import type { Client, RequestHookInfo, ResponseHookInfo, Span } from '@sentry/core';
/** Options for Request Instrumentation */
export interface RequestInstrumentationOptions {
    /**
     * List of strings and/or Regular Expressions used to determine which outgoing requests will have `sentry-trace` and `baggage`
     * headers attached.
     *
     * **Default:** If this option is not provided, tracing headers will be attached to all outgoing requests.
     * If you are using a browser SDK, by default, tracing headers will only be attached to outgoing requests to the same origin.
     *
     * **Disclaimer:** Carelessly setting this option in browser environments may result into CORS errors!
     * Only attach tracing headers to requests to the same origin, or to requests to services you can control CORS headers of.
     * Cross-origin requests, meaning requests to a different domain, for example a request to `https://api.example.com/` while you're on `https://example.com/`, take special care.
     * If you are attaching headers to cross-origin requests, make sure the backend handling the request returns a `"Access-Control-Allow-Headers: sentry-trace, baggage"` header to ensure your requests aren't blocked.
     *
     * If you provide a `tracePropagationTargets` array, the entries you provide will be matched against the entire URL of the outgoing request.
     * If you are using a browser SDK, the entries will also be matched against the pathname of the outgoing requests.
     * This is so you can have matchers for relative requests, for example, `/^\/api/` if you want to trace requests to your `/api` routes on the same domain.
     *
     * If any of the two match any of the provided values, tracing headers will be attached to the outgoing request.
     * Both, the string values, and the RegExes you provide in the array will match if they partially match the URL or pathname.
     *
     * Examples:
     * - `tracePropagationTargets: [/^\/api/]` and request to `https://same-origin.com/api/posts`:
     *   - Tracing headers will be attached because the request is sent to the same origin and the regex matches the pathname "/api/posts".
     * - `tracePropagationTargets: [/^\/api/]` and request to `https://different-origin.com/api/posts`:
     *   - Tracing headers will not be attached because the pathname will only be compared when the request target lives on the same origin.
     * - `tracePropagationTargets: [/^\/api/, 'https://external-api.com']` and request to `https://external-api.com/v1/data`:
     *   - Tracing headers will be attached because the request URL matches the string `'https://external-api.com'`.
     */
    tracePropagationTargets?: Array<string | RegExp>;
    /**
     * Flag to disable patching all together for fetch requests.
     *
     * Default: true
     */
    traceFetch: boolean;
    /**
     * Flag to disable patching all together for xhr requests.
     *
     * Default: true
     */
    traceXHR: boolean;
    /**
     * Flag to disable tracking of long-lived streams, like server-sent events (SSE) via fetch.
     * Do not enable this in case you have live streams or very long running streams.
     *
     * Disabled by default since it can lead to issues with streams using the `cancel()` api
     * (https://github.com/getsentry/sentry-javascript/issues/13950)
     *
     * Default: false
     */
    trackFetchStreamPerformance: boolean;
    /**
     * If true, Sentry will capture http timings and add them to the corresponding http spans.
     *
     * Default: true
     */
    enableHTTPTimings: boolean;
    /**
     * This function will be called before creating a span for a request with the given url.
     * Return false if you don't want a span for the given url.
     *
     * Default: (url: string) => true
     */
    shouldCreateSpanForRequest?(this: void, url: string): boolean;
    /**
     * Is called when spans are started for outgoing requests.
     */
    onRequestSpanStart?(span: Span, requestInformation: RequestHookInfo): void;
    /**
     * Is called when spans end for outgoing requests, providing access to response headers.
     */
    onRequestSpanEnd?(span: Span, responseInformation: ResponseHookInfo): void;
}
export declare const defaultRequestInstrumentationOptions: RequestInstrumentationOptions;
/** Registers span creators for xhr and fetch requests  */
export declare function instrumentOutgoingRequests(client: Client, _options?: Partial<RequestInstrumentationOptions>): void;
/**
 * A function that determines whether to attach tracing headers to a request.
 * We only export this function for testing purposes.
 */
export declare function shouldAttachHeaders(targetUrl: string, tracePropagationTargets: (string | RegExp)[] | undefined): boolean;
//# sourceMappingURL=request.d.ts.map