/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPMetricExporterBase } from '@opentelemetry/exporter-metrics-otlp-http';
import { ProtobufMetricsSerializer } from '@opentelemetry/otlp-transformer';
import { createLegacyOtlpBrowserExportDelegate } from '@opentelemetry/otlp-exporter-base/browser-http';
export class OTLPMetricExporter extends OTLPMetricExporterBase {
    constructor(config = {}) {
        super(createLegacyOtlpBrowserExportDelegate(config, ProtobufMetricsSerializer, 'v1/metrics', { 'Content-Type': 'application/x-protobuf' }), config);
    }
}
//# sourceMappingURL=OTLPMetricExporter.js.map