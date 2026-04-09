/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPExporterBase, } from '@opentelemetry/otlp-exporter-base';
import { ProtobufLogsSerializer } from '@opentelemetry/otlp-transformer';
import { createLegacyOtlpBrowserExportDelegate } from '@opentelemetry/otlp-exporter-base/browser-http';
/**
 * Collector Trace Exporter for Web
 */
export class OTLPLogExporter extends OTLPExporterBase {
    constructor(config = {}) {
        super(createLegacyOtlpBrowserExportDelegate(config, ProtobufLogsSerializer, 'v1/logs', { 'Content-Type': 'application/x-protobuf' }));
    }
}
//# sourceMappingURL=OTLPLogExporter.js.map