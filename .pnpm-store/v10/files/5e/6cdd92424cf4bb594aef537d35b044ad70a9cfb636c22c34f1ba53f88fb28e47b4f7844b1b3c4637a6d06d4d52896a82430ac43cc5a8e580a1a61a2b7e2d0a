/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
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
export var SpanKind;
(function (SpanKind) {
    SpanKind["CLIENT"] = "CLIENT";
    SpanKind["SERVER"] = "SERVER";
    SpanKind["CONSUMER"] = "CONSUMER";
    SpanKind["PRODUCER"] = "PRODUCER";
})(SpanKind || (SpanKind = {}));
//# sourceMappingURL=types.js.map