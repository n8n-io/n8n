"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExportTraceServiceRequest = void 0;
const internal_1 = require("./internal");
const common_1 = require("../common");
const internal_2 = require("../common/internal");
const internal_3 = require("../resource/internal");
function createExportTraceServiceRequest(spans, options) {
    const encoder = (0, common_1.getOtlpEncoder)(options);
    return {
        resourceSpans: spanRecordsToResourceSpans(spans, encoder),
    };
}
exports.createExportTraceServiceRequest = createExportTraceServiceRequest;
function createResourceMap(readableSpans) {
    const resourceMap = new Map();
    for (const record of readableSpans) {
        let ilmMap = resourceMap.get(record.resource);
        if (!ilmMap) {
            ilmMap = new Map();
            resourceMap.set(record.resource, ilmMap);
        }
        // TODO this is duplicated in basic tracer. Consolidate on a common helper in core
        const instrumentationLibraryKey = `${record.instrumentationLibrary.name}@${record.instrumentationLibrary.version || ''}:${record.instrumentationLibrary.schemaUrl || ''}`;
        let records = ilmMap.get(instrumentationLibraryKey);
        if (!records) {
            records = [];
            ilmMap.set(instrumentationLibraryKey, records);
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
                const spans = scopeSpans.map(readableSpan => (0, internal_1.sdkSpanToOtlpSpan)(readableSpan, encoder));
                scopeResourceSpans.push({
                    scope: (0, internal_2.createInstrumentationScope)(scopeSpans[0].instrumentationLibrary),
                    spans: spans,
                    schemaUrl: scopeSpans[0].instrumentationLibrary.schemaUrl,
                });
            }
            ilmEntry = ilmIterator.next();
        }
        // TODO SDK types don't provide resource schema URL at this time
        const transformedSpans = {
            resource: (0, internal_3.createResource)(resource),
            scopeSpans: scopeResourceSpans,
            schemaUrl: undefined,
        };
        out.push(transformedSpans);
        entry = entryIterator.next();
    }
    return out;
}
//# sourceMappingURL=index.js.map