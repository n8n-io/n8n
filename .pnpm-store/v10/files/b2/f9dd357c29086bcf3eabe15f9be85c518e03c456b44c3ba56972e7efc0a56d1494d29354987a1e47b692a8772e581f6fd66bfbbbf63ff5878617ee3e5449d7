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
import * as root from '../../generated/root';
import { createExportMetricsServiceRequest } from '../internal';
const metricsResponseType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceResponse;
const metricsRequestType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceRequest;
export const ProtobufMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = createExportMetricsServiceRequest([arg]);
        return metricsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return metricsResponseType.decode(arg);
    },
};
//# sourceMappingURL=metrics.js.map