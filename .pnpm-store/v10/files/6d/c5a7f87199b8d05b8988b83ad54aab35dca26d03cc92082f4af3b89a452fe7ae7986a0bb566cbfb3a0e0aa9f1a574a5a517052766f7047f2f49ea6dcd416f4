/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPMetricExporterBase } from '../../OTLPMetricExporterBase';
import { JsonMetricsSerializer } from '@opentelemetry/otlp-transformer';
import { convertLegacyHttpOptions, createOtlpHttpExportDelegate, } from '@opentelemetry/otlp-exporter-base/node-http';
/**
 * OTLP Metric Exporter for Node.js
 */
export class OTLPMetricExporter extends OTLPMetricExporterBase {
    constructor(config) {
        super(createOtlpHttpExportDelegate(convertLegacyHttpOptions(config ?? {}, 'METRICS', 'v1/metrics', {
            'Content-Type': 'application/json',
        }), JsonMetricsSerializer), config);
    }
}
//# sourceMappingURL=OTLPMetricExporter.js.map