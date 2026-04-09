/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import * as root from '../../generated/root';
import { createExportMetricsServiceRequest } from '../internal';
import { PROTOBUF_ENCODER } from '../../common/utils';
const metricsResponseType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceResponse;
const metricsRequestType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceRequest;
export const ProtobufMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = createExportMetricsServiceRequest([arg], PROTOBUF_ENCODER);
        return metricsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return metricsResponseType.decode(arg);
    },
};
//# sourceMappingURL=metrics.js.map