"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPMetricExporter = void 0;
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const otlp_grpc_exporter_base_1 = require("@opentelemetry/otlp-grpc-exporter-base");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
/**
 * OTLP-gRPC metric exporter
 */
class OTLPMetricExporter extends exporter_metrics_otlp_http_1.OTLPMetricExporterBase {
    constructor(config) {
        super((0, otlp_grpc_exporter_base_1.createOtlpGrpcExportDelegate)((0, otlp_grpc_exporter_base_1.convertLegacyOtlpGrpcOptions)(config ?? {}, 'METRICS'), otlp_transformer_1.ProtobufMetricsSerializer, 'MetricsExportService', '/opentelemetry.proto.collector.metrics.v1.MetricsService/Export'), config);
    }
}
exports.OTLPMetricExporter = OTLPMetricExporter;
//# sourceMappingURL=OTLPMetricExporter.js.map