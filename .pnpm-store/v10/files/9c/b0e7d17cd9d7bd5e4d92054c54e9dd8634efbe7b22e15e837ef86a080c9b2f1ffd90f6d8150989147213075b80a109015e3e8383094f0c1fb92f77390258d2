var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { sdkSpanToOtlpSpan } from './internal';
import { getOtlpEncoder } from '../common';
import { createInstrumentationScope } from '../common/internal';
import { createResource } from '../resource/internal';
export function createExportTraceServiceRequest(spans, options) {
    var encoder = getOtlpEncoder(options);
    return {
        resourceSpans: spanRecordsToResourceSpans(spans, encoder),
    };
}
function createResourceMap(readableSpans) {
    var e_1, _a;
    var resourceMap = new Map();
    try {
        for (var readableSpans_1 = __values(readableSpans), readableSpans_1_1 = readableSpans_1.next(); !readableSpans_1_1.done; readableSpans_1_1 = readableSpans_1.next()) {
            var record = readableSpans_1_1.value;
            var ilmMap = resourceMap.get(record.resource);
            if (!ilmMap) {
                ilmMap = new Map();
                resourceMap.set(record.resource, ilmMap);
            }
            // TODO this is duplicated in basic tracer. Consolidate on a common helper in core
            var instrumentationLibraryKey = record.instrumentationLibrary.name + "@" + (record.instrumentationLibrary.version || '') + ":" + (record.instrumentationLibrary.schemaUrl || '');
            var records = ilmMap.get(instrumentationLibraryKey);
            if (!records) {
                records = [];
                ilmMap.set(instrumentationLibraryKey, records);
            }
            records.push(record);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (readableSpans_1_1 && !readableSpans_1_1.done && (_a = readableSpans_1.return)) _a.call(readableSpans_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return resourceMap;
}
function spanRecordsToResourceSpans(readableSpans, encoder) {
    var resourceMap = createResourceMap(readableSpans);
    var out = [];
    var entryIterator = resourceMap.entries();
    var entry = entryIterator.next();
    while (!entry.done) {
        var _a = __read(entry.value, 2), resource = _a[0], ilmMap = _a[1];
        var scopeResourceSpans = [];
        var ilmIterator = ilmMap.values();
        var ilmEntry = ilmIterator.next();
        while (!ilmEntry.done) {
            var scopeSpans = ilmEntry.value;
            if (scopeSpans.length > 0) {
                var spans = scopeSpans.map(function (readableSpan) {
                    return sdkSpanToOtlpSpan(readableSpan, encoder);
                });
                scopeResourceSpans.push({
                    scope: createInstrumentationScope(scopeSpans[0].instrumentationLibrary),
                    spans: spans,
                    schemaUrl: scopeSpans[0].instrumentationLibrary.schemaUrl,
                });
            }
            ilmEntry = ilmIterator.next();
        }
        // TODO SDK types don't provide resource schema URL at this time
        var transformedSpans = {
            resource: createResource(resource),
            scopeSpans: scopeResourceSpans,
            schemaUrl: undefined,
        };
        out.push(transformedSpans);
        entry = entryIterator.next();
    }
    return out;
}
//# sourceMappingURL=index.js.map