/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPExporterBase } from '@opentelemetry/otlp-exporter-base';
import { JsonLogsSerializer } from '@opentelemetry/otlp-transformer';
import { createLegacyOtlpBrowserExportDelegate } from '@opentelemetry/otlp-exporter-base/browser-http';
/**
 * Collector Logs Exporter for Web
 */
export class OTLPLogExporter extends OTLPExporterBase {
    constructor(config = {}) {
        super(createLegacyOtlpBrowserExportDelegate(config, JsonLogsSerializer, 'v1/logs', { 'Content-Type': 'application/json' }));
    }
}
//# sourceMappingURL=OTLPLogExporter.js.map