"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtobufMetricsSerializer = void 0;
const root = require("../../generated/root");
const internal_1 = require("../internal");
const utils_1 = require("../../common/utils");
const metricsResponseType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceResponse;
const metricsRequestType = root.opentelemetry.proto.collector.metrics.v1
    .ExportMetricsServiceRequest;
exports.ProtobufMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, internal_1.createExportMetricsServiceRequest)([arg], utils_1.PROTOBUF_ENCODER);
        return metricsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return metricsResponseType.decode(arg);
    },
};
//# sourceMappingURL=metrics.js.map