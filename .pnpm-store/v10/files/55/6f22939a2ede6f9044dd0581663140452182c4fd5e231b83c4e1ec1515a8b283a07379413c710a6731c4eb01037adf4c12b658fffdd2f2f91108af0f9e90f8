/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPMetricExporterBase } from '@opentelemetry/exporter-metrics-otlp-http';
import { ProtobufMetricsSerializer } from '@opentelemetry/otlp-transformer';
import { convertLegacyHttpOptions, createOtlpHttpExportDelegate, } from '@opentelemetry/otlp-exporter-base/node-http';
export class OTLPMetricExporter extends OTLPMetricExporterBase {
    constructor(config) {
        super(createOtlpHttpExportDelegate(convertLegacyHttpOptions(config ?? {}, 'METRICS', 'v1/metrics', {
            'Content-Type': 'application/x-protobuf',
        }), ProtobufMetricsSerializer), config);
    }
}
//# sourceMappingURL=OTLPMetricExporter.js.map