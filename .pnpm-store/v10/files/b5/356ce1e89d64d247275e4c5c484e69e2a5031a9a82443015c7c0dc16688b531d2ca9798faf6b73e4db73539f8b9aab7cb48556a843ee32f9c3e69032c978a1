import { a as RequestControllerSource, i as RequestController, n as IS_PATCHED_MODULE, r as RequestCredentials, t as HttpRequestEventMap } from "./glossary-BdLS4k1H.cjs";
import { a as InterceptorReadyState, c as getGlobalSymbol, i as InterceptorEventMap, n as INTERNAL_REQUEST_ID_HEADER_NAME, o as InterceptorSubscription, r as Interceptor, s as deleteGlobalSymbol, t as ExtractEventNames } from "./Interceptor-Deczogc8.cjs";
import { EventMap, Listener } from "strict-event-emitter";

//#region src/BatchInterceptor.d.ts
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
//#endregion
//#region src/createRequestId.d.ts
/**
 * Generate a random ID string to represent a request.
 * @example
 * createRequestId()
 * // "f774b6c9c600f"
 */
declare function createRequestId(): string;
//#endregion
//#region src/utils/getCleanUrl.d.ts
/**
 * Removes query parameters and hashes from a given URL.
 */
declare function getCleanUrl(url: URL, isAbsolute?: boolean): string;
//#endregion
//#region src/utils/bufferUtils.d.ts
declare function encodeBuffer(text: string): Uint8Array;
declare function decodeBuffer(buffer: ArrayBuffer, encoding?: string): string;
//#endregion
//#region src/utils/fetchUtils.d.ts
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
//#endregion
//#region src/getRawRequest.d.ts
/**
 * Returns a raw request instance associated with this request.
 *
 * @example
 * interceptor.on('request', ({ request }) => {
 *   const rawRequest = getRawRequest(request)
 *
 *   if (rawRequest instanceof http.ClientRequest) {
 *     console.log(rawRequest.rawHeaders)
 *   }
 * })
 */
declare function getRawRequest(request: Request): unknown | undefined;
//#endregion
//#region src/utils/resolveWebSocketUrl.d.ts
/**
 * Resolve potentially relative WebSocket URLs the same way
 * the browser does (replace the protocol, use the origin, etc).
 *
 * @see https://websockets.spec.whatwg.org//#dom-websocket-websocket
 */
declare function resolveWebSocketUrl(url: string | URL): string;
//#endregion
export { BatchInterceptor, BatchInterceptorOptions, ExtractEventMapType, ExtractEventNames, FetchResponse, HttpRequestEventMap, INTERNAL_REQUEST_ID_HEADER_NAME, IS_PATCHED_MODULE, Interceptor, InterceptorEventMap, InterceptorReadyState, InterceptorSubscription, RequestController, type RequestControllerSource, RequestCredentials, createRequestId, decodeBuffer, deleteGlobalSymbol, encodeBuffer, getCleanUrl, getGlobalSymbol, getRawRequest, resolveWebSocketUrl };
//# sourceMappingURL=index.d.cts.map