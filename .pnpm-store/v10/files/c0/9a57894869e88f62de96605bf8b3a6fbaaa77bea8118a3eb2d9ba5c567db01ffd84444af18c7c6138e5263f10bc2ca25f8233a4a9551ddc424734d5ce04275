import { RequestEventData } from '../types-hoist/request';
import { WebFetchHeaders, WebFetchRequest } from '../types-hoist/webfetchapi';
/**
 * Transforms a `Headers` object that implements the `Web Fetch API` (https://developer.mozilla.org/en-US/docs/Web/API/Headers) into a simple key-value dict.
 * The header keys will be lower case: e.g. A "Content-Type" header will be stored as "content-type".
 */
export declare function winterCGHeadersToDict(winterCGHeaders: WebFetchHeaders): Record<string, string>;
/**
 * Convert common request headers to a simple dictionary.
 */
export declare function headersToDict(reqHeaders: Record<string, string | string[] | undefined>): Record<string, string>;
/**
 * Converts a `Request` object that implements the `Web Fetch API` (https://developer.mozilla.org/en-US/docs/Web/API/Headers) into the format that the `RequestData` integration understands.
 */
export declare function winterCGRequestToRequestData(req: WebFetchRequest): RequestEventData;
/**
 * Convert a HTTP request object to RequestEventData to be passed as normalizedRequest.
 * Instead of allowing `PolymorphicRequest` to be passed,
 * we want to be more specific and generally require a http.IncomingMessage-like object.
 */
export declare function httpRequestToRequestData(request: {
    method?: string;
    url?: string;
    headers?: {
        [key: string]: string | string[] | undefined;
    };
    protocol?: string;
    socket?: {
        encrypted?: boolean;
        remoteAddress?: string;
    };
}): RequestEventData;
/**
 * Converts incoming HTTP request headers to OpenTelemetry span attributes following semantic conventions.
 * Header names are converted to the format: http.request.header.<key>
 * where <key> is the header name in lowercase with dashes converted to underscores.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/#http-request-header
 */
export declare function httpHeadersToSpanAttributes(headers: Record<string, string | string[] | undefined>, sendDefaultPii?: boolean): Record<string, string>;
/** Extract the query params from an URL. */
export declare function extractQueryParamsFromUrl(url: string): string | undefined;
//# sourceMappingURL=request.d.ts.map
