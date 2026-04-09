"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPMetricExporter = void 0;
const OTLPMetricExporterBase_1 = require("../../OTLPMetricExporterBase");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const browser_http_1 = require("@opentelemetry/otlp-exporter-base/browser-http");
/**
 * Collector Metric Exporter for Web
 */
class OTLPMetricExporter extends OTLPMetricExporterBase_1.OTLPMetricExporterBase {
    constructor(config) {
        super((0, browser_http_1.createLegacyOtlpBrowserExportDelegate)(config ?? {}, otlp_transformer_1.JsonMetricsSerializer, 'v1/metrics', { 'Content-Type': 'application/json' }), config);
    }
}
exports.OTLPMetricExporter = OTLPMetricExporter;
//# sourceMappingURL=OTLPMetricExporter.js.map