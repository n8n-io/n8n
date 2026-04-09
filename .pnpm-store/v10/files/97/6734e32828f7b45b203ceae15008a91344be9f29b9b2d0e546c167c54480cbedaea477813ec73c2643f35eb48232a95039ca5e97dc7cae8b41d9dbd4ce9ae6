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
import * as root from '../generated/root';
import { createExportTraceServiceRequest } from '../trace';
import { createExportMetricsServiceRequest } from '../metrics';
import { createExportLogsServiceRequest } from '../logs';
var logsResponseType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceResponse;
var logsRequestType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceRequest;
var metricsResponseType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceResponse;
var metricsRequestType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceRequest;
var traceResponseType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceResponse;
var traceRequestType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceRequest;
export var ProtobufLogsSerializer = {
    serializeRequest: function (arg) {
        var request = createExportLogsServiceRequest(arg);
        return logsRequestType.encode(request).finish();
    },
    deserializeResponse: function (arg) {
        return logsResponseType.decode(arg);
    },
};
export var ProtobufMetricsSerializer = {
    serializeRequest: function (arg) {
        var request = createExportMetricsServiceRequest(arg);
        return metricsRequestType.encode(request).finish();
    },
    deserializeResponse: function (arg) {
        return metricsResponseType.decode(arg);
    },
};
export var ProtobufTraceSerializer = {
    serializeRequest: function (arg) {
        var request = createExportTraceServiceRequest(arg);
        return traceRequestType.encode(request).finish();
    },
    deserializeResponse: function (arg) {
        return traceResponseType.decode(arg);
    },
};
//# sourceMappingURL=serializers.js.map