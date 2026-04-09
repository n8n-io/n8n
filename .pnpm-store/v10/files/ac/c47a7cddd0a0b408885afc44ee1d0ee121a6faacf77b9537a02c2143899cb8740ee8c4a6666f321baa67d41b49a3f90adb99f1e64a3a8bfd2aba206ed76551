/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPExporterBase, } from '@opentelemetry/otlp-exporter-base';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
import { createLegacyOtlpBrowserExportDelegate } from '@opentelemetry/otlp-exporter-base/browser-http';
/**
 * Collector Trace Exporter for Web
 */
export class OTLPTraceExporter extends OTLPExporterBase {
    constructor(config = {}) {
        super(createLegacyOtlpBrowserExportDelegate(config, JsonTraceSerializer, 'v1/traces', { 'Content-Type': 'application/json' }));
    }
}
//# sourceMappingURL=OTLPTraceExporter.js.map