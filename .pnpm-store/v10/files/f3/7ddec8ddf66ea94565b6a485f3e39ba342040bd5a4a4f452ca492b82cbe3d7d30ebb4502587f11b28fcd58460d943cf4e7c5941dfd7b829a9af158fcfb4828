/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import * as api from '@opentelemetry/api';
import { hrTimeToMicroseconds } from '@opentelemetry/core';
import * as zipkinTypes from './types';
const ZIPKIN_SPAN_KIND_MAPPING = {
    [api.SpanKind.CLIENT]: zipkinTypes.SpanKind.CLIENT,
    [api.SpanKind.SERVER]: zipkinTypes.SpanKind.SERVER,
    [api.SpanKind.CONSUMER]: zipkinTypes.SpanKind.CONSUMER,
    [api.SpanKind.PRODUCER]: zipkinTypes.SpanKind.PRODUCER,
    // When absent, the span is local.
    [api.SpanKind.INTERNAL]: undefined,
};
export const defaultStatusCodeTagName = 'otel.status_code';
export const defaultStatusErrorTagName = 'error';
/**
 * Translate OpenTelemetry ReadableSpan to ZipkinSpan format
 * @param span Span to be translated
 */
export function toZipkinSpan(span, serviceName, statusCodeTagName, statusErrorTagName) {
    const zipkinSpan = {
        traceId: span.spanContext().traceId,
        parentId: span.parentSpanContext?.spanId,
        name: span.name,
        id: span.spanContext().spanId,
        kind: ZIPKIN_SPAN_KIND_MAPPING[span.kind],
        timestamp: hrTimeToMicroseconds(span.startTime),
        duration: Math.round(hrTimeToMicroseconds(span.duration)),
        localEndpoint: { serviceName },
        tags: _toZipkinTags(span, statusCodeTagName, statusErrorTagName),
        annotations: span.events.length
            ? _toZipkinAnnotations(span.events)
            : undefined,
    };
    return zipkinSpan;
}
/** Converts OpenTelemetry Span properties to Zipkin Tags format. */
export function _toZipkinTags({ attributes, resource, status, droppedAttributesCount, droppedEventsCount, droppedLinksCount, }, statusCodeTagName, statusErrorTagName) {
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
/**
 * Converts OpenTelemetry Events to Zipkin Annotations format.
 */
export function _toZipkinAnnotations(events) {
    return events.map(event => ({
        timestamp: Math.round(hrTimeToMicroseconds(event.time)),
        value: event.name,
    }));
}
//# sourceMappingURL=transform.js.map