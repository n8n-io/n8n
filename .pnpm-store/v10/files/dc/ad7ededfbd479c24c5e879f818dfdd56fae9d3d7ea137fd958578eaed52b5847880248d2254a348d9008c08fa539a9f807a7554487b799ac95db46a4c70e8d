/// <reference types="node" />
import { Attributes, SpanStatusCode, Span, SpanKind, DiagLogger } from '@opentelemetry/api';
import { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders, RequestOptions, ServerResponse } from 'http';
import { SemconvStability } from '@opentelemetry/instrumentation';
import * as url from 'url';
import { Err, IgnoreMatcher, ParsedRequestOptions } from './internal-types';
/**
 * Get an absolute url
 */
export declare const getAbsoluteUrl: (requestUrl: ParsedRequestOptions | null, headers: IncomingHttpHeaders | OutgoingHttpHeaders, fallbackProtocol?: string, redactedQueryParams?: string[]) => string;
/**
 * Parse status code from HTTP response. [More details](https://github.com/open-telemetry/opentelemetry-specification/blob/master/specification/data-http.md#status)
 */
export declare const parseResponseStatus: (kind: SpanKind, statusCode?: number) => SpanStatusCode;
/**
 * Check whether the given obj match pattern
 * @param constant e.g URL of request
 * @param pattern Match pattern
 */
export declare const satisfiesPattern: (constant: string, pattern: IgnoreMatcher) => boolean;
/**
 * Sets the span with the error passed in params
 * @param {Span} span the span that need to be set
 * @param {Error} error error that will be set to span
 * @param {SemconvStability} semconvStability determines which semconv version to use
 */
export declare const setSpanWithError: (span: Span, error: Err, semconvStability: SemconvStability) => void;
/**
 * Adds attributes for request content-length and content-encoding HTTP headers
 * @param { IncomingMessage } Request object whose headers will be analyzed
 * @param { Attributes } Attributes object to be modified
 */
export declare const setRequestContentLengthAttribute: (request: IncomingMessage, attributes: Attributes) => void;
/**
 * Adds attributes for response content-length and content-encoding HTTP headers
 * @param { IncomingMessage } Response object whose headers will be analyzed
 * @param { Attributes } Attributes object to be modified
 *
 * @deprecated this is for an older version of semconv. It is retained for compatibility using OTEL_SEMCONV_STABILITY_OPT_IN
 */
export declare const setResponseContentLengthAttribute: (response: IncomingMessage, attributes: Attributes) => void;
export declare const isCompressed: (headers: OutgoingHttpHeaders | IncomingHttpHeaders) => boolean;
/**
 * Makes sure options is an url object
 * return an object with default value and parsed options
 * @param logger component logger
 * @param options original options for the request
 * @param [extraOptions] additional options for the request
 */
export declare const getRequestInfo: (logger: DiagLogger, options: url.URL | RequestOptions | string, extraOptions?: RequestOptions) => {
    origin: string;
    pathname: string;
    method: string;
    invalidUrl: boolean;
    optionsParsed: RequestOptions;
};
/**
 * Makes sure options is of type string or object
 * @param options for the request
 */
export declare const isValidOptionsType: (options: unknown) => boolean;
export declare const extractHostnameAndPort: (requestOptions: Pick<ParsedRequestOptions, 'hostname' | 'host' | 'port' | 'protocol'>) => {
    hostname: string;
    port: number | string;
};
/**
 * Returns outgoing request attributes scoped to the options passed to the request
 * @param {ParsedRequestOptions} requestOptions the same options used to make the request
 * @param {{ component: string, hostname: string, hookAttributes?: Attributes }} options used to pass data needed to create attributes
 * @param {SemconvStability} semconvStability determines which semconv version to use
 */
export declare const getOutgoingRequestAttributes: (requestOptions: ParsedRequestOptions, options: {
    component: string;
    hostname: string;
    port: string | number;
    hookAttributes?: Attributes;
    redactedQueryParams?: string[];
}, semconvStability: SemconvStability, enableSyntheticSourceDetection: boolean) => Attributes;
/**
 * Returns outgoing request Metric attributes scoped to the request data
 * @param {Attributes} spanAttributes the span attributes
 */
export declare const getOutgoingRequestMetricAttributes: (spanAttributes: Attributes) => Attributes;
/**
 * Returns attributes related to the kind of HTTP protocol used
 * @param {string} [kind] Kind of HTTP protocol used: "1.0", "1.1", "2", "SPDY" or "QUIC".
 */
export declare const setAttributesFromHttpKind: (kind: string | undefined, attributes: Attributes) => void;
/**
 * Returns outgoing request attributes scoped to the response data
 * @param {IncomingMessage} response the response object
 * @param {SemconvStability} semconvStability determines which semconv version to use
 */
export declare const getOutgoingRequestAttributesOnResponse: (response: IncomingMessage, semconvStability: SemconvStability) => Attributes;
/**
 * Returns outgoing request Metric attributes scoped to the response data
 * @param {Attributes} spanAttributes the span attributes
 */
export declare const getOutgoingRequestMetricAttributesOnResponse: (spanAttributes: Attributes) => Attributes;
export declare const getOutgoingStableRequestMetricAttributesOnResponse: (spanAttributes: Attributes) => Attributes;
/**
 * Get server.address and port according to http semconv 1.27
 * https://github.com/open-telemetry/semantic-conventions/blob/bf0a2c1134f206f034408b201dbec37960ed60ec/docs/http/http-spans.md#setting-serveraddress-and-serverport-attributes
 */
export declare function getRemoteClientAddress(request: IncomingMessage): string | null;
/**
 * Returns incoming request attributes scoped to the request data
 * @param {IncomingMessage} request the request object
 * @param {{ component: string, serverName?: string, hookAttributes?: Attributes }} options used to pass data needed to create attributes
 * @param {SemconvStability} semconvStability determines which semconv version to use
 */
export declare const getIncomingRequestAttributes: (request: IncomingMessage, options: {
    component: 'http' | 'https';
    serverName?: string;
    hookAttributes?: Attributes;
    semconvStability: SemconvStability;
    enableSyntheticSourceDetection: boolean;
}, logger: DiagLogger) => Attributes;
/**
 * Returns incoming request Metric attributes scoped to the request data
 * @param {Attributes} spanAttributes the span attributes
 * @param {{ component: string }} options used to pass data needed to create attributes
 */
export declare const getIncomingRequestMetricAttributes: (spanAttributes: Attributes) => Attributes;
/**
 * Returns incoming request attributes scoped to the response data
 * @param {(ServerResponse & { socket: Socket; })} response the response object
 */
export declare const getIncomingRequestAttributesOnResponse: (request: IncomingMessage, response: ServerResponse, semconvStability: SemconvStability) => Attributes;
/**
 * Returns incoming request Metric attributes scoped to the request data
 * @param {Attributes} spanAttributes the span attributes
 */
export declare const getIncomingRequestMetricAttributesOnResponse: (spanAttributes: Attributes) => Attributes;
/**
 * Returns incoming stable request Metric attributes scoped to the request data
 * @param {Attributes} spanAttributes the span attributes
 */
export declare const getIncomingStableRequestMetricAttributesOnResponse: (spanAttributes: Attributes) => Attributes;
export declare function headerCapture(type: 'request' | 'response', headers: string[]): (span: Span, getHeader: (key: string) => undefined | string | string[] | number) => void;
//# sourceMappingURL=utils.d.ts.map