"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPMetricExporter = void 0;
const OTLPMetricExporterBase_1 = require("../../OTLPMetricExporterBase");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const node_http_1 = require("@opentelemetry/otlp-exporter-base/node-http");
/**
 * OTLP Metric Exporter for Node.js
 */
class OTLPMetricExporter extends OTLPMetricExporterBase_1.OTLPMetricExporterBase {
    constructor(config) {
        super((0, node_http_1.createOtlpHttpExportDelegate)((0, node_http_1.convertLegacyHttpOptions)(config ?? {}, 'METRICS', 'v1/metrics', {
            'Content-Type': 'application/json',
        }), otlp_transformer_1.JsonMetricsSerializer), config);
    }
}
exports.OTLPMetricExporter = OTLPMetricExporter;
//# sourceMappingURL=OTLPMetricExporter.js.map