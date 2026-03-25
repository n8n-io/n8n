export { H as HttpRequestEventMap, I as IS_PATCHED_MODULE, R as RequestController, a as RequestCredentials } from './glossary-6564c252.js';
import { I as Interceptor, E as ExtractEventNames } from './Interceptor-af98b768.js';
export { c as INTERNAL_REQUEST_ID_HEADER_NAME, a as InterceptorEventMap, e as InterceptorReadyState, b as InterceptorSubscription, d as deleteGlobalSymbol, g as getGlobalSymbol } from './Interceptor-af98b768.js';
import { EventMap, Listener } from 'strict-event-emitter';
import '@open-draft/deferred-promise';
import '@open-draft/logger';

interface BatchInterceptorOptions<InterceptorList extends ReadonlyArray<Interceptor<any>>> {
    name: string;
    interceptors: InterceptorList;
}
type ExtractEventMapType<InterceptorList extends ReadonlyArray<Interceptor<any>>> = InterceptorList extends ReadonlyArray<infer InterceptorType> ? InterceptorType extends Interceptor<infer EventMap> ? EventMap : never : never;
/**
 * A batch interceptor that exposes a single interface
 * to apply and operate with multiple interceptors at once.
 */
declare class BatchInterceptor<InterceptorList extends ReadonlyArray<Interceptor<any>>, Events extends EventMap = ExtractEventMapType<InterceptorList>> extends Interceptor<Events> {
    static symbol: symbol;
    private interceptors;
    constructor(options: BatchInterceptorOptions<InterceptorList>);
    protected setup(): void;
    on<EventName extends ExtractEventNames<Events>>(event: EventName, listener: Listener<Events[EventName]>): this;
    once<EventName extends ExtractEventNames<Events>>(event: EventName, listener: Listener<Events[EventName]>): this;
    off<EventName extends ExtractEventNames<Events>>(event: EventName, listener: Listener<Events[EventName]>): this;
    removeAllListeners<EventName extends ExtractEventNames<Events>>(event?: EventName | undefined): this;
}

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

export { BatchInterceptor, BatchInterceptorOptions, ExtractEventMapType, ExtractEventNames, FetchResponse, Interceptor, createRequestId, decodeBuffer, encodeBuffer, getCleanUrl };
