/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
//# sourceMappingURL=types.js.map