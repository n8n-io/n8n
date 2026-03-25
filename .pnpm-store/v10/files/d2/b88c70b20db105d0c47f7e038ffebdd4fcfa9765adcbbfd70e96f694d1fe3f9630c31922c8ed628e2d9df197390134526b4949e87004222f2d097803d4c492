import { Agent } from 'http';
import { Readable } from 'stream';
/**
 * TypeScript does not have this type available globally - however `@types/node` includes `undici-types`, which has it:
 * - https://www.npmjs.com/package/@types/node/v/18.19.59?activeTab=dependencies
 *
 * Additionally, this is the TypeScript pattern for type sniffing and `import("undici-types")` is pretty common:
 * - https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/globals.d.ts
 */
type _BodyInit = typeof globalThis extends {
    BodyInit: infer T;
} ? T : import('undici-types').BodyInit;
/**
 * An AIP-193 conforming error interface.
 *
 * @see {@link https://google.aip.dev/193#http11json-representation AIP-193}
 *
 * @param res the response object
 * @returns the extracted error information
 */
export interface AIPErrorInterface {
    error: {
        code: number;
        message: string;
        status: string;
        details?: {}[];
    };
}
/**
 * Support `instanceof` operator for `GaxiosError`s in different versions of this library.
 *
 * @see {@link GaxiosError[Symbol.hasInstance]}
 */
export declare const GAXIOS_ERROR_SYMBOL: unique symbol;
export declare class GaxiosError<T = ReturnType<JSON['parse']>> extends Error {
    config: GaxiosOptionsPrepared;
    response?: GaxiosResponse<T> | undefined;
    /**
     * An error code.
     * Can be a system error code, DOMException error name, or any error's 'code' property where it is a `string`.
     *
     * It is only a `number` when the cause is sourced from an API-level error (AIP-193).
     *
     * @see {@link https://nodejs.org/api/errors.html#errorcode error.code}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException#error_names DOMException#error_names}
     * @see {@link https://google.aip.dev/193#http11json-representation AIP-193}
     *
     * @example
     * 'ECONNRESET'
     *
     * @example
     * 'TimeoutError'
     *
     * @example
     * 500
     */
    code?: string | number;
    /**
     * An HTTP Status code.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/status Response#status}
     *
     * @example
     * 500
     */
    status?: number;
    /**
     * @deprecated use {@link GaxiosError.cause} instead.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause Error#cause}
     *
     * @privateRemarks
     *
     * We will want to remove this property later as the modern `cause` property is better suited
     * for displaying and relaying nested errors. Keeping this here makes the resulting
     * error log larger than it needs to be.
     *
     */
    error?: Error | NodeJS.ErrnoException;
    /**
     * Support `instanceof` operator for `GaxiosError` across builds/duplicated files.
     *
     * @see {@link GAXIOS_ERROR_SYMBOL}
     * @see {@link GaxiosError[Symbol.hasInstance]}
     * @see {@link https://github.com/microsoft/TypeScript/issues/13965#issuecomment-278570200}
     * @see {@link https://stackoverflow.com/questions/46618852/require-and-instanceof}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/@@hasInstance#reverting_to_default_instanceof_behavior}
     */
    [GAXIOS_ERROR_SYMBOL]: string;
    /**
     * Support `instanceof` operator for `GaxiosError` across builds/duplicated files.
     *
     * @see {@link GAXIOS_ERROR_SYMBOL}
     * @see {@link GaxiosError[GAXIOS_ERROR_SYMBOL]}
     */
    static [Symbol.hasInstance](instance: unknown): boolean;
    constructor(message: string, config: GaxiosOptionsPrepared, response?: GaxiosResponse<T> | undefined, cause?: unknown);
}
type GaxiosResponseData = ReturnType<JSON['parse']> | GaxiosOptionsPrepared['data'];
export type GaxiosPromise<T = GaxiosResponseData> = Promise<GaxiosResponse<T>>;
export interface GaxiosResponse<T = GaxiosResponseData> extends Response {
    config: GaxiosOptionsPrepared;
    data: T;
}
export interface GaxiosMultipartOptions {
    headers: Headers;
    content: string | Readable;
}
/**
 * Request options that are used to form the request.
 */
export interface GaxiosOptions extends RequestInit {
    /**
     * Optional method to override making the actual HTTP request. Useful
     * for writing tests.
     */
    adapter?: <T = GaxiosResponseData>(options: GaxiosOptionsPrepared, defaultAdapter: (options: GaxiosOptionsPrepared) => GaxiosPromise<T>) => GaxiosPromise<T>;
    url?: string | URL;
    baseURL?: string | URL;
    /**
     * The data to send in the {@link RequestInit.body} of the request. Objects will be
     * serialized as JSON, except for:
     * - `ArrayBuffer`
     * - `Blob`
     * - `Buffer` (Node.js)
     * - `DataView`
     * - `File`
     * - `FormData`
     * - `ReadableStream`
     * - `stream.Readable` (Node.js)
     * - strings
     * - `TypedArray` (e.g. `Uint8Array`, `BigInt64Array`)
     * - `URLSearchParams`
     * - all other objects where:
     *   - headers['Content-Type'] === 'application/x-www-form-urlencoded' (serialized as `URLSearchParams`)
     *
     * In all other cases, if you would like to prevent `application/json` as the
     * default `Content-Type` header you must provide a string or readable stream
     * rather than an object, e.g.:
     *
     * ```ts
     * {data: JSON.stringify({some: 'data'})}
     * {data: fs.readFile('./some-data.jpeg')}
     * ```
     */
    data?: _BodyInit | ArrayBuffer | Blob | Buffer | DataView | File | FormData | ReadableStream | Readable | string | ArrayBufferView | URLSearchParams | {};
    /**
     * The maximum size of the http response `Content-Length` in bytes allowed.
     */
    maxContentLength?: number;
    /**
     * The maximum number of redirects to follow. Defaults to 20.
     *
     * @deprecated non-spec. Should use `20` if enabled per-spec: https://fetch.spec.whatwg.org/#http-redirect-fetch
     */
    maxRedirects?: number;
    /**
     * @deprecated non-spec. Should use `20` if enabled per-spec: https://fetch.spec.whatwg.org/#http-redirect-fetch
     */
    follow?: number;
    /**
     * A collection of parts to send as a `Content-Type: multipart/related` request.
     *
     * This is passed to {@link RequestInit.body}.
     */
    multipart?: GaxiosMultipartOptions[];
    params?: GaxiosResponseData;
    /**
     * @deprecated Use {@link URLSearchParams} instead and pass this directly to {@link GaxiosOptions.data `data`}.
     */
    paramsSerializer?: (params: {
        [index: string]: string | number;
    }) => string;
    /**
     * A timeout for the request, in milliseconds. No timeout by default.
     */
    timeout?: number;
    /**
     * @deprecated ignored
     */
    onUploadProgress?: (progressEvent: GaxiosResponseData) => void;
    /**
     * If the `fetchImplementation` is native `fetch`, the
     * stream is a `ReadableStream`, otherwise `readable.Stream`
     */
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream' | 'unknown';
    agent?: Agent | ((parsedUrl: URL) => Agent);
    validateStatus?: (status: number) => boolean;
    retryConfig?: RetryConfig;
    retry?: boolean;
    /**
     * @deprecated non-spec. https://github.com/node-fetch/node-fetch/issues/1438
     */
    size?: number;
    /**
     * Implementation of `fetch` to use when making the API call. Will use `fetch` by default.
     *
     * @example
     *
     * let customFetchCalled = false;
     * const myFetch = (...args: Parameters<typeof fetch>) => {
     *  customFetchCalled = true;
     *  return fetch(...args);
     * };
     *
     * {fetchImplementation: myFetch};
     */
    fetchImplementation?: typeof fetch;
    cert?: string;
    key?: string;
    /**
     * An optional proxy to use for requests.
     * Available via `process.env.HTTP_PROXY` and `process.env.HTTPS_PROXY` as well - with a preference for the this config option when multiple are available.
     * The {@link GaxiosOptions.agent `agent`} option overrides this.
     *
     * @see {@link GaxiosOptions.noProxy}
     * @see {@link GaxiosOptions.agent}
     */
    proxy?: string | URL;
    /**
     * A list for excluding traffic for proxies.
     * Available via `process.env.NO_PROXY` as well as a common-separated list of strings - merged with any local `noProxy` rules.
     *
     * - When provided a string, it is matched by
     *   - Wildcard `*.` and `.` matching are available. (e.g. `.example.com` or `*.example.com`)
     * - When provided a URL, it is matched by the `.origin` property.
     *   - For example, requesting `https://example.com` with the following `noProxy`s would result in a no proxy use:
     *     - new URL('https://example.com')
     *     - new URL('https://example.com:443')
     *   - The following would be used with a proxy:
     *     - new URL('http://example.com:80')
     *     - new URL('https://example.com:8443')
     * - When provided a regular expression it is used to match the stringified URL
     *
     * @see {@link GaxiosOptions.proxy}
     */
    noProxy?: (string | URL | RegExp)[];
    /**
     * An experimental error redactor.
     *
     * @remarks
     *
     * This does not replace the requirement for an active Data Loss Prevention (DLP) provider. For DLP suggestions, see:
     * - https://cloud.google.com/sensitive-data-protection/docs/redacting-sensitive-data#dlp_deidentify_replace_infotype-nodejs
     * - https://cloud.google.com/sensitive-data-protection/docs/infotypes-reference#credentials_and_secrets
     *
     * @experimental
     */
    errorRedactor?: typeof defaultErrorRedactor | false;
}
export interface GaxiosOptionsPrepared extends GaxiosOptions {
    headers: Headers;
    url: URL;
}
/**
 * Gaxios retry configuration.
 */
export interface RetryConfig {
    /**
     * The number of times to retry the request.  Defaults to 3.
     */
    retry?: number;
    /**
     * The number of retries already attempted.
     */
    currentRetryAttempt?: number;
    /**
     * The amount of time to initially delay the retry, in ms.  Defaults to 100ms.
     */
    retryDelay?: number;
    /**
     * The HTTP Methods that will be automatically retried.
     * Defaults to ['GET','PUT','HEAD','OPTIONS','DELETE']
     */
    httpMethodsToRetry?: string[];
    /**
     * The HTTP response status codes that will automatically be retried.
     * Defaults to: [[100, 199], [408, 408], [429, 429], [500, 599]]
     */
    statusCodesToRetry?: number[][];
    /**
     * Function to invoke when a retry attempt is made.
     */
    onRetryAttempt?: (err: GaxiosError) => Promise<void> | void;
    /**
     * Function to invoke which determines if you should retry
     */
    shouldRetry?: (err: GaxiosError) => Promise<boolean> | boolean;
    /**
     * When there is no response, the number of retries to attempt. Defaults to 2.
     */
    noResponseRetries?: number;
    /**
     * Function to invoke which returns a promise. After the promise resolves,
     * the retry will be triggered. If provided, this will be used in-place of
     * the `retryDelay`
     */
    retryBackoff?: (err: GaxiosError, defaultBackoffMs: number) => Promise<void>;
    /**
     * Time that the initial request was made. Users should not set this directly.
     */
    timeOfFirstRequest?: number;
    /**
     * The length of time to keep retrying in ms. The last sleep period will
     * be shortened as necessary, so that the last retry runs at deadline (and not
     * considerably beyond it).  The total time starting from when the initial
     * request is sent, after which an error will be returned, regardless of the
     * retrying attempts made meanwhile. Defaults to Number.MAX_SAFE_INTEGER indicating to effectively
     * ignore totalTimeout.
     */
    totalTimeout?: number;
    maxRetryDelay?: number;
    retryDelayMultiplier?: number;
}
/**
 * An experimental error redactor.
 *
 * @param config Config to potentially redact properties of
 * @param response Config to potentially redact properties of
 *
 * @experimental
 */
export declare function defaultErrorRedactor<O extends GaxiosOptionsPrepared, R extends GaxiosResponse<GaxiosResponseData>>(data: {
    config?: O;
    response?: R;
}): {
    config?: O;
    response?: R;
};
export {};
