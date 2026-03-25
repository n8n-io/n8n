"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports._toZipkinAnnotations = exports._toZipkinTags = exports.toZipkinSpan = exports.defaultStatusErrorTagName = exports.defaultStatusCodeTagName = void 0;
const api = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const zipkinTypes = require("./types");
const ZIPKIN_SPAN_KIND_MAPPING = {
    [api.SpanKind.CLIENT]: zipkinTypes.SpanKind.CLIENT,
    [api.SpanKind.SERVER]: zipkinTypes.SpanKind.SERVER,
    [api.SpanKind.CONSUMER]: zipkinTypes.SpanKind.CONSUMER,
    [api.SpanKind.PRODUCER]: zipkinTypes.SpanKind.PRODUCER,
    // When absent, the span is local.
    [api.SpanKind.INTERNAL]: undefined,
};
exports.defaultStatusCodeTagName = 'otel.status_code';
exports.defaultStatusErrorTagName = 'error';
/**
 * Translate OpenTelemetry ReadableSpan to ZipkinSpan format
 * @param span Span to be translated
 */
function toZipkinSpan(span, serviceName, statusCodeTagName, statusErrorTagName) {
    const zipkinSpan = {
        traceId: span.spanContext().traceId,
        parentId: span.parentSpanContext?.spanId,
        name: span.name,
        id: span.spanContext().spanId,
        kind: ZIPKIN_SPAN_KIND_MAPPING[span.kind],
        timestamp: (0, core_1.hrTimeToMicroseconds)(span.startTime),
        duration: Math.round((0, core_1.hrTimeToMicroseconds)(span.duration)),
        localEndpoint: { serviceName },
        tags: _toZipkinTags(span, statusCodeTagName, statusErrorTagName),
        annotations: span.events.length
            ? _toZipkinAnnotations(span.events)
            : undefined,
    };
    return zipkinSpan;
}
exports.toZipkinSpan = toZipkinSpan;
/** Converts OpenTelemetry Span properties to Zipkin Tags format. */
function _toZipkinTags({ attributes, resource, status, droppedAttributesCount, droppedEventsCount, droppedLinksCount, }, statusCodeTagName, statusErrorTagName) {
    const tags = {};
    for (const key of Object.keys(attributes)) {
        tags[key] = String(attributes[key]);
    }
    if (status.code !== api.SpanStatusCode.UNSET) {
        tags[statusCodeTagName] = String(api.SpanStatusCode[status.code]);
    }
    if (status.code === api.SpanStatusCode.ERROR && status.message) {
        tags[statusErrorTagName] = status.message;
    }
    /* Add droppedAttributesCount as a tag */
    if (droppedAttributesCount) {
        tags['otel.dropped_attributes_count'] = String(droppedAttributesCount);
    }
    /* Add droppedEventsCount as a tag */
    if (droppedEventsCount) {
        tags['otel.dropped_events_count'] = String(droppedEventsCount);
    }
    /* Add droppedLinksCount as a tag */
    if (droppedLinksCount) {
        tags['otel.dropped_links_count'] = String(droppedLinksCount);
    }
    Object.keys(resource.attributes).forEach(name => (tags[name] = String(resource.attributes[name])));
    return tags;
}
exports._toZipkinTags = _toZipkinTags;
/**
 * Converts OpenTelemetry Events to Zipkin Annotations format.
 */
function _toZipkinAnnotations(events) {
    return events.map(event => ({
        timestamp: Math.round((0, core_1.hrTimeToMicroseconds)(event.time)),
        value: event.name,
    }));
}
exports._toZipkinAnnotations = _toZipkinAnnotations;
//# sourceMappingURL=transform.js.map