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
exports.OTLPMetricExporter = void 0;
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const browser_http_1 = require("@opentelemetry/otlp-exporter-base/browser-http");
class OTLPMetricExporter extends exporter_metrics_otlp_http_1.OTLPMetricExporterBase {
    constructor(config = {}) {
        super((0, browser_http_1.createLegacyOtlpBrowserExportDelegate)(config, otlp_transformer_1.ProtobufMetricsSerializer, 'v1/metrics', { 'Content-Type': 'application/x-protobuf' }), config);
    }
}
exports.OTLPMetricExporter = OTLPMetricExporter;
//# sourceMappingURL=OTLPMetricExporter.js.map