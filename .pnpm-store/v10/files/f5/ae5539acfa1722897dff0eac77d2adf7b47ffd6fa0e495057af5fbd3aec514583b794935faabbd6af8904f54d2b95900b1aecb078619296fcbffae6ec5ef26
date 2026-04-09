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
exports.toLogAttributes = exports.createExportLogsServiceRequest = void 0;
const common_1 = require("../common");
const internal_1 = require("../common/internal");
const internal_2 = require("../resource/internal");
function createExportLogsServiceRequest(logRecords, options) {
    const encoder = (0, common_1.getOtlpEncoder)(options);
    return {
        resourceLogs: logRecordsToResourceLogs(logRecords, encoder),
    };
}
exports.createExportLogsServiceRequest = createExportLogsServiceRequest;
function createResourceMap(logRecords) {
    const resourceMap = new Map();
    for (const record of logRecords) {
        const { resource, instrumentationScope: { name, version = '', schemaUrl = '' }, } = record;
        let ismMap = resourceMap.get(resource);
        if (!ismMap) {
            ismMap = new Map();
            resourceMap.set(resource, ismMap);
        }
        const ismKey = `${name}@${version}:${schemaUrl}`;
        let records = ismMap.get(ismKey);
        if (!records) {
            records = [];
            ismMap.set(ismKey, records);
        }
        records.push(record);
    }
    return resourceMap;
}
function logRecordsToResourceLogs(logRecords, encoder) {
    const resourceMap = createResourceMap(logRecords);
    return Array.from(resourceMap, ([resource, ismMap]) => ({
        resource: (0, internal_2.createResource)(resource),
        scopeLogs: Array.from(ismMap, ([, scopeLogs]) => {
            return {
                scope: (0, internal_1.createInstrumentationScope)(scopeLogs[0].instrumentationScope),
                logRecords: scopeLogs.map(log => toLogRecord(log, encoder)),
                schemaUrl: scopeLogs[0].instrumentationScope.schemaUrl,
            };
        }),
        schemaUrl: undefined,
    }));
}
function toLogRecord(log, encoder) {
    var _a, _b, _c;
    return {
        timeUnixNano: encoder.encodeHrTime(log.hrTime),
        observedTimeUnixNano: encoder.encodeHrTime(log.hrTimeObserved),
        severityNumber: toSeverityNumber(log.severityNumber),
        severityText: log.severityText,
        body: (0, internal_1.toAnyValue)(log.body),
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
function toLogAttributes(attributes) {
    return Object.keys(attributes).map(key => (0, internal_1.toKeyValue)(key, attributes[key]));
}
exports.toLogAttributes = toLogAttributes;
//# sourceMappingURL=index.js.map