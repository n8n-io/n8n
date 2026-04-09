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
import { getOtlpEncoder } from '../common';
import { createInstrumentationScope, toAnyValue, toKeyValue, } from '../common/internal';
import { createResource } from '../resource/internal';
export function createExportLogsServiceRequest(logRecords, options) {
    var encoder = getOtlpEncoder(options);
    return {
        resourceLogs: logRecordsToResourceLogs(logRecords, encoder),
    };
}
function createResourceMap(logRecords) {
    var e_1, _a;
    var resourceMap = new Map();
    try {
        for (var logRecords_1 = __values(logRecords), logRecords_1_1 = logRecords_1.next(); !logRecords_1_1.done; logRecords_1_1 = logRecords_1.next()) {
            var record = logRecords_1_1.value;
            var resource = record.resource, _b = record.instrumentationScope, name_1 = _b.name, _c = _b.version, version = _c === void 0 ? '' : _c, _d = _b.schemaUrl, schemaUrl = _d === void 0 ? '' : _d;
            var ismMap = resourceMap.get(resource);
            if (!ismMap) {
                ismMap = new Map();
                resourceMap.set(resource, ismMap);
            }
            var ismKey = name_1 + "@" + version + ":" + schemaUrl;
            var records = ismMap.get(ismKey);
            if (!records) {
                records = [];
                ismMap.set(ismKey, records);
            }
            records.push(record);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (logRecords_1_1 && !logRecords_1_1.done && (_a = logRecords_1.return)) _a.call(logRecords_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return resourceMap;
}
function logRecordsToResourceLogs(logRecords, encoder) {
    var resourceMap = createResourceMap(logRecords);
    return Array.from(resourceMap, function (_a) {
        var _b = __read(_a, 2), resource = _b[0], ismMap = _b[1];
        return ({
            resource: createResource(resource),
            scopeLogs: Array.from(ismMap, function (_a) {
                var _b = __read(_a, 2), scopeLogs = _b[1];
                return {
                    scope: createInstrumentationScope(scopeLogs[0].instrumentationScope),
                    logRecords: scopeLogs.map(function (log) { return toLogRecord(log, encoder); }),
                    schemaUrl: scopeLogs[0].instrumentationScope.schemaUrl,
                };
            }),
            schemaUrl: undefined,
        });
    });
}
function toLogRecord(log, encoder) {
    var _a, _b, _c;
    return {
        timeUnixNano: encoder.encodeHrTime(log.hrTime),
        observedTimeUnixNano: encoder.encodeHrTime(log.hrTimeObserved),
        severityNumber: toSeverityNumber(log.severityNumber),
        severityText: log.severityText,
        body: toAnyValue(log.body),
        attributes: toLogAttributes(log.attributes),
        droppedAttributesCount: log.droppedAttributesCount,
        flags: (_a = log.spanContext) === null || _a === void 0 ? void 0 : _a.traceFlags,
        traceId: encoder.encodeOptionalSpanContext((_b = log.spanContext) === null || _b === void 0 ? void 0 : _b.traceId),
        spanId: encoder.encodeOptionalSpanContext((_c = log.spanContext) === null || _c === void 0 ? void 0 : _c.spanId),
    };
}
function toSeverityNumber(severityNumber) {
    return severityNumber;
}
export function toLogAttributes(attributes) {
    return Object.keys(attributes).map(function (key) { return toKeyValue(key, attributes[key]); });
}
//# sourceMappingURL=index.js.map