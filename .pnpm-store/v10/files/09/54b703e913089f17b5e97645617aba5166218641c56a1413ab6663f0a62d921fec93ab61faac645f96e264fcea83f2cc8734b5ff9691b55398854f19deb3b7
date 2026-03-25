import { ExportResult } from '@opentelemetry/core';
/**
 * Exporter config
 */
export interface ExporterConfig {
    headers?: Record<string, string>;
    serviceName?: string;
    url?: string;
    statusCodeTagName?: string;
    statusDescriptionTagName?: string;
    getExportRequestHeaders?: () => Record<string, string> | undefined;
}
/**
 * Zipkin Span
 * @see https://github.com/openzipkin/zipkin-api/blob/master/zipkin2-api.yaml
 */
export interface Span {
    /**
     * Trace identifier, set on all spans within it.
     */
    traceId: string;
    /**
     * The logical operation this span represents in lowercase (e.g. rpc method).
     * Leave absent if unknown.
     */
    name: string;
    /**
     * The parent span ID or absent if this the root span in a trace.
     */
    parentId?: string;
    /**
     * Unique 64bit identifier for this operation within the trace.
     */
    id: string;
    /**
     * When present, kind clarifies timestamp, duration and remoteEndpoint.
     * When absent, the span is local or incomplete.
     */
    kind?: SpanKind;
    /**
     * Epoch microseconds of the start of this span, possibly absent if
     * incomplete.
     */
    timestamp: number;
    /**
     * Duration in microseconds of the critical path, if known.
     */
    duration: number;
    /**
     * True is a request to store this span even if it overrides sampling policy.
     * This is true when the `X-B3-Flags` header has a value of 1.
     */
    debug?: boolean;
    /**
     * True if we are contributing to a span started by another tracer (ex on a
     * different host).
     */
    shared?: boolean;
    /**
     * The host that recorded this span, primarily for query by service name.
     */
    localEndpoint: Endpoint;
    /**
     * Associates events that explain latency with the time they happened.
     */
    annotations?: Annotation[];
    /**
     * Tags give your span context for search, viewing and analysis.
     */
    tags: Tags;
}
/**
 * Associates an event that explains latency with a timestamp.
 * Unlike log statements, annotations are often codes. Ex. "ws" for WireSend
 * Zipkin v1 core annotations such as "cs" and "sr" have been replaced with
 * Span.Kind, which interprets timestamp and duration.
 */
export interface Annotation {
    /**
     * Epoch microseconds of this event.
     * For example, 1502787600000000 corresponds to 2017-08-15 09:00 UTC
     */
    timestamp: number;
    /**
     * Usually a short tag indicating an event, like "error"
     * While possible to add larger data, such as garbage collection details, low
     * cardinality event names both keep the size of spans down and also are easy
     * to search against.
     */
    value: string;
}
/**
 * The network context of a node in the service graph.
 */
export interface Endpoint {
    /**
     * Lower-case label of this node in the service graph, such as "favstar".
     * Leave absent if unknown.
     * This is a primary label for trace lookup and aggregation, so it should be
     * intuitive and consistent. Many use a name from service discovery.
     */
    serviceName?: string;
    /**
     * The text representation of the primary IPv4 address associated with this
     * connection. Ex. 192.168.99.100 Absent if unknown.
     */
    ipv4?: string;
    /**
     * The text representation of the primary IPv6 address associated with a
     * connection. Ex. 2001:db8::c001 Absent if unknown.
     * Prefer using the ipv4 field for mapped addresses.
     */
    port?: number;
}
/**
 * Adds context to a span, for search, viewing and analysis.
 * For example, a key "your_app.version" would let you lookup traces by version.
 * A tag "sql.query" isn't searchable, but it can help in debugging when viewing
 * a trace.
 */
export interface Tags {
    [tagKey: string]: unknown;
}
/**
 * When present, kind clarifies timestamp, duration and remoteEndpoint. When
 * absent, the span is local or incomplete. Unlike client and server, there
 * is no direct critical path latency relationship between producer and
 * consumer spans.
 * `CLIENT`
 *   timestamp is the moment a request was sent to the server.
 *   duration is the delay until a response or an error was received.
 *   remoteEndpoint is the server.
 * `SERVER`
 *   timestamp is the moment a client request was received.
 *   duration is the delay until a response was sent or an error.
 *   remoteEndpoint is the client.
 * `PRODUCER`
 *   timestamp is the moment a message was sent to a destination.
 *   duration is the delay sending the message, such as batching.
 *   remoteEndpoint is the broker.
 * `CONSUMER`
 *   timestamp is the moment a message was received from an origin.
 *   duration is the delay consuming the message, such as from backlog.
 *   remoteEndpoint - Represents the broker. Leave serviceName absent if unknown.
 */
export declare enum SpanKind {
    CLIENT = "CLIENT",
    SERVER = "SERVER",
    CONSUMER = "CONSUMER",
    PRODUCER = "PRODUCER"
}
/**
 * interface for function that will send zipkin spans
 */
export type SendFunction = (zipkinSpans: Span[], done: (result: ExportResult) => void) => void;
export type GetHeaders = () => Record<string, string> | undefined;
export type SendFn = (zipkinSpans: Span[], done: (result: ExportResult) => void) => void;
//# sourceMappingURL=types.d.ts.map