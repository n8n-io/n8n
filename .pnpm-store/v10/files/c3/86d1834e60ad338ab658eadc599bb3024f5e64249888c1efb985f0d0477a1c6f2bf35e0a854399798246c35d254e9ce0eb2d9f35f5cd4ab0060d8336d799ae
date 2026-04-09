"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPTraceExporter = void 0;
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const browser_http_1 = require("@opentelemetry/otlp-exporter-base/browser-http");
/**
 * Collector Trace Exporter for Web
 */
class OTLPTraceExporter extends otlp_exporter_base_1.OTLPExporterBase {
    constructor(config = {}) {
        super((0, browser_http_1.createLegacyOtlpBrowserExportDelegate)(config, otlp_transformer_1.JsonTraceSerializer, 'v1/traces', { 'Content-Type': 'application/json' }));
    }
}
exports.OTLPTraceExporter = OTLPTraceExporter;
//# sourceMappingURL=OTLPTraceExporter.js.map