import { a as InterceptorReadyState, c as getGlobalSymbol, d as RequestCredentials, f as RequestController, i as InterceptorEventMap, l as HttpRequestEventMap, n as INTERNAL_REQUEST_ID_HEADER_NAME, o as InterceptorSubscription, p as RequestControllerSource, r as Interceptor, s as deleteGlobalSymbol, t as ExtractEventNames, u as IS_PATCHED_MODULE } from "./Interceptor-DEazpLJd.mjs";
import { n as BatchInterceptorOptions, r as ExtractEventMapType, t as BatchInterceptor } from "./BatchInterceptor-D7mXzHcQ.mjs";

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
//# sourceMappingURL=index.d.mts.map