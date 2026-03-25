"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExportTraceServiceRequest = exports.toOtlpSpanEvent = exports.toOtlpLink = exports.sdkSpanToOtlpSpan = void 0;
const internal_1 = require("../common/internal");
const utils_1 = require("../common/utils");
function sdkSpanToOtlpSpan(span, encoder) {
    const ctx = span.spanContext();
    const status = span.status;
    const parentSpanId = span.parentSpanContext?.spanId
        ? encoder.encodeSpanContext(span.parentSpanContext?.spanId)
        : undefined;
    return {
        traceId: encoder.encodeSpanContext(ctx.traceId),
        spanId: encoder.encodeSpanContext(ctx.spanId),
        parentSpanId: parentSpanId,
        traceState: ctx.traceState?.serialize(),
        name: span.name,
        // Span kind is offset by 1 because the API does not define a value for unset
        kind: span.kind == null ? 0 : span.kind + 1,
        startTimeUnixNano: encoder.encodeHrTime(span.startTime),
        endTimeUnixNano: encoder.encodeHrTime(span.endTime),
        attributes: (0, internal_1.toAttributes)(span.attributes),
        droppedAttributesCount: span.droppedAttributesCount,
        events: span.events.map(event => toOtlpSpanEvent(event, encoder)),
        droppedEventsCount: span.droppedEventsCount,
        status: {
            // API and proto enums share the same values
            code: status.code,
            message: status.message,
        },
        links: span.links.map(link => toOtlpLink(link, encoder)),
        droppedLinksCount: span.droppedLinksCount,
    };
}
exports.sdkSpanToOtlpSpan = sdkSpanToOtlpSpan;
function toOtlpLink(link, encoder) {
    return {
        attributes: link.attributes ? (0, internal_1.toAttributes)(link.attributes) : [],
        spanId: encoder.encodeSpanContext(link.context.spanId),
        traceId: encoder.encodeSpanContext(link.context.traceId),
        traceState: link.context.traceState?.serialize(),
        droppedAttributesCount: link.droppedAttributesCount || 0,
    };
}
exports.toOtlpLink = toOtlpLink;
function toOtlpSpanEvent(timedEvent, encoder) {
    return {
        attributes: timedEvent.attributes
            ? (0, internal_1.toAttributes)(timedEvent.attributes)
            : [],
        name: timedEvent.name,
        timeUnixNano: encoder.encodeHrTime(timedEvent.time),
        droppedAttributesCount: timedEvent.droppedAttributesCount || 0,
    };
}
exports.toOtlpSpanEvent = toOtlpSpanEvent;
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
function createExportTraceServiceRequest(spans, options) {
    const encoder = (0, utils_1.getOtlpEncoder)(options);
    return {
        resourceSpans: spanRecordsToResourceSpans(spans, encoder),
    };
}
exports.createExportTraceServiceRequest = createExportTraceServiceRequest;
function createResourceMap(readableSpans) {
    const resourceMap = new Map();
    for (const record of readableSpans) {
        let ilsMap = resourceMap.get(record.resource);
        if (!ilsMap) {
            ilsMap = new Map();
            resourceMap.set(record.resource, ilsMap);
        }
        // TODO this is duplicated in basic tracer. Consolidate on a common helper in core
        const instrumentationScopeKey = `${record.instrumentationScope.name}@${record.instrumentationScope.version || ''}:${record.instrumentationScope.schemaUrl || ''}`;
        let records = ilsMap.get(instrumentationScopeKey);
        if (!records) {
            records = [];
            ilsMap.set(instrumentationScopeKey, records);
        }
        records.push(record);
    }
    return resourceMap;
}
function spanRecordsToResourceSpans(readableSpans, encoder) {
    const resourceMap = createResourceMap(readableSpans);
    const out = [];
    const entryIterator = resourceMap.entries();
    let entry = entryIterator.next();
    while (!entry.done) {
        const [resource, ilmMap] = entry.value;
        const scopeResourceSpans = [];
        const ilmIterator = ilmMap.values();
        let ilmEntry = ilmIterator.next();
        while (!ilmEntry.done) {
            const scopeSpans = ilmEntry.value;
            if (scopeSpans.length > 0) {
                const spans = scopeSpans.map(readableSpan => sdkSpanToOtlpSpan(readableSpan, encoder));
                scopeResourceSpans.push({
                    scope: (0, internal_1.createInstrumentationScope)(scopeSpans[0].instrumentationScope),
                    spans: spans,
                    schemaUrl: scopeSpans[0].instrumentationScope.schemaUrl,
                });
            }
            ilmEntry = ilmIterator.next();
        }
        const processedResource = (0, internal_1.createResource)(resource);
        const transformedSpans = {
            resource: processedResource,
            scopeSpans: scopeResourceSpans,
            schemaUrl: processedResource.schemaUrl,
        };
        out.push(transformedSpans);
        entry = entryIterator.next();
    }
    return out;
}
//# sourceMappingURL=internal.js.map