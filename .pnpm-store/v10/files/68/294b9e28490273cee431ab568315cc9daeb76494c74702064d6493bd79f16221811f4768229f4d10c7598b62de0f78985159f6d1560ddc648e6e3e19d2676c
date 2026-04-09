/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPExporterBase, } from '@opentelemetry/otlp-exporter-base';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
import { convertLegacyHttpOptions, createOtlpHttpExportDelegate, } from '@opentelemetry/otlp-exporter-base/node-http';
/**
 * Collector Trace Exporter for Node
 */
export class OTLPTraceExporter extends OTLPExporterBase {
    constructor(config = {}) {
        super(createOtlpHttpExportDelegate(convertLegacyHttpOptions(config, 'TRACES', 'v1/traces', {
            'Content-Type': 'application/json',
        }), JsonTraceSerializer));
    }
}
//# sourceMappingURL=OTLPTraceExporter.js.map