/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * SpanKind is the type of span. Can be used to specify additional relationships between spans
 * in addition to a parent/child relationship.
 */
export var ESpanKind;
(function (ESpanKind) {
    /** Unspecified. Do NOT use as default. Implementations MAY assume SpanKind to be INTERNAL when receiving UNSPECIFIED. */
    ESpanKind[ESpanKind["SPAN_KIND_UNSPECIFIED"] = 0] = "SPAN_KIND_UNSPECIFIED";
    /** Indicates that the span represents an internal operation within an application,
     * as opposed to an operation happening at the boundaries. Default value.
     */
    ESpanKind[ESpanKind["SPAN_KIND_INTERNAL"] = 1] = "SPAN_KIND_INTERNAL";
    /** Indicates that the span covers server-side handling of an RPC or other
     * remote network request.
     */
    ESpanKind[ESpanKind["SPAN_KIND_SERVER"] = 2] = "SPAN_KIND_SERVER";
    /** Indicates that the span describes a request to some remote service.
     */
    ESpanKind[ESpanKind["SPAN_KIND_CLIENT"] = 3] = "SPAN_KIND_CLIENT";
    /** Indicates that the span describes a producer sending a message to a broker.
     * Unlike CLIENT and SERVER, there is often no direct critical path latency relationship
     * between producer and consumer spans. A PRODUCER span ends when the message was accepted
     * by the broker while the logical processing of the message might span a much longer time.
     */
    ESpanKind[ESpanKind["SPAN_KIND_PRODUCER"] = 4] = "SPAN_KIND_PRODUCER";
    /** Indicates that the span describes consumer receiving a message from a broker.
     * Like the PRODUCER kind, there is often no direct critical path latency relationship
     * between producer and consumer spans.
     */
    ESpanKind[ESpanKind["SPAN_KIND_CONSUMER"] = 5] = "SPAN_KIND_CONSUMER";
})(ESpanKind || (ESpanKind = {}));
/** StatusCode enum. */
export var EStatusCode;
(function (EStatusCode) {
    /** The default status. */
    EStatusCode[EStatusCode["STATUS_CODE_UNSET"] = 0] = "STATUS_CODE_UNSET";
    /** The Span has been evaluated by an Application developers or Operator to have completed successfully. */
    EStatusCode[EStatusCode["STATUS_CODE_OK"] = 1] = "STATUS_CODE_OK";
    /** The Span contains an error. */
    EStatusCode[EStatusCode["STATUS_CODE_ERROR"] = 2] = "STATUS_CODE_ERROR";
})(EStatusCode || (EStatusCode = {}));
//# sourceMappingURL=internal-types.js.map