"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPTraceExporter = void 0;
const otlp_grpc_exporter_base_1 = require("@opentelemetry/otlp-grpc-exporter-base");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
/**
 * OTLP Trace Exporter for Node
 */
class OTLPTraceExporter extends otlp_exporter_base_1.OTLPExporterBase {
    constructor(config = {}) {
        super((0, otlp_grpc_exporter_base_1.createOtlpGrpcExportDelegate)((0, otlp_grpc_exporter_base_1.convertLegacyOtlpGrpcOptions)(config, 'TRACES'), otlp_transformer_1.ProtobufTraceSerializer, 'TraceExportService', '/opentelemetry.proto.collector.trace.v1.TraceService/Export'));
    }
}
exports.OTLPTraceExporter = OTLPTraceExporter;
//# sourceMappingURL=OTLPTraceExporter.js.map