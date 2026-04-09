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
exports.ProtobufTraceSerializer = exports.ProtobufMetricsSerializer = exports.ProtobufLogsSerializer = void 0;
const root = require("../generated/root");
const trace_1 = require("../trace");
const metrics_1 = require("../metrics");
const logs_1 = require("../logs");
const logsResponseType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceResponse;
const logsRequestType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceRequest;
const metricsResponseType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceResponse;
const metricsRequestType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceRequest;
const traceResponseType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceResponse;
const traceRequestType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceRequest;
exports.ProtobufLogsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, logs_1.createExportLogsServiceRequest)(arg);
        return logsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return logsResponseType.decode(arg);
    },
};
exports.ProtobufMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, metrics_1.createExportMetricsServiceRequest)(arg);
        return metricsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return metricsResponseType.decode(arg);
    },
};
exports.ProtobufTraceSerializer = {
    serializeRequest: (arg) => {
        const request = (0, trace_1.createExportTraceServiceRequest)(arg);
        return traceRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return traceResponseType.decode(arg);
    },
};
//# sourceMappingURL=serializers.js.map