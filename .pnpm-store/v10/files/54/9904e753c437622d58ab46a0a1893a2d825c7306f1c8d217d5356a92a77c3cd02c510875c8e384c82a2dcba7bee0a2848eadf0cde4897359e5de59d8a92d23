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
exports.ProtobufMetricsSerializer = void 0;
const root = require("../../generated/root");
const internal_1 = require("../internal");
const metricsResponseType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceResponse;
const metricsRequestType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceRequest;
exports.ProtobufMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, internal_1.createExportMetricsServiceRequest)([arg]);
        return metricsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return metricsResponseType.decode(arg);
    },
};
//# sourceMappingURL=metrics.js.map