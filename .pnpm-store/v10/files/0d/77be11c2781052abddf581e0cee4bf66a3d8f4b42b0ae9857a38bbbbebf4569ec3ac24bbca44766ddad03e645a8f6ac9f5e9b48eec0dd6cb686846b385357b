export { E as ExtractEventNames, H as HttpRequestEventMap, d as INTERNAL_REQUEST_ID_HEADER_NAME, I as IS_PATCHED_MODULE, h as Interceptor, b as InterceptorEventMap, f as InterceptorReadyState, c as InterceptorSubscription, R as RequestController, a as RequestCredentials, e as deleteGlobalSymbol, g as getGlobalSymbol } from './Interceptor-436630be.js';
export { a as BatchInterceptor, B as BatchInterceptorOptions, E as ExtractEventMapType } from './BatchInterceptor-67bf41ba.js';
import '@open-draft/deferred-promise';
import '@open-draft/logger';
import 'strict-event-emitter';

/**
 * Generate a random ID string to represent a request.
 * @example
 * createRequestId()
 * // "f774b6c9c600f"
 */
declare function createRequestId(): string;

/**
 * Removes query parameters and hashes from a given URL.
 */
declare function getCleanUrl(url: URL, isAbsolute?: boolean): string;

declare function encodeBuffer(text: string): Uint8Array;
declare function decodeBuffer(buffer: ArrayBuffer, encoding?: string): string;

interface FetchResponseInit extends ResponseInit {
    url?: string;
}
declare class FetchResponse extends Response {
    /**
     * Response status codes for responses that cannot have body.
     * @see https://fetch.spec.whatwg.org/#statuses
     */
    static readonly STATUS_CODES_WITHOUT_BODY: number[];
    static readonly STATUS_CODES_WITH_REDIRECT: number[];
    static isConfigurableStatusCode(status: number): boolean;
    static isRedirectResponse(status: number): boolean;
    /**
     * Returns a boolean indicating whether the given response status
     * code represents a response that can have a body.
     */
    static isResponseWithBody(status: number): boolean;
    static setUrl(url: string | undefined, response: Response): void;
    /**
     * Parses the given raw HTTP headers into a Fetch API `Headers` instance.
     */
    static parseRawHeaders(rawHeaders: Array<string>): Headers;
    constructor(body?: BodyInit | null, init?: FetchResponseInit);
}

export { FetchResponse, createRequestId, decodeBuffer, encodeBuffer, getCleanUrl };
