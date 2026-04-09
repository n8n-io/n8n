/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { OTLPExporterBase, } from '@opentelemetry/otlp-exporter-base';
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';
import { createLegacyOtlpBrowserExportDelegate } from '@opentelemetry/otlp-exporter-base/browser-http';
const DEFAULT_COLLECTOR_RESOURCE_PATH = 'v1/traces';
/**
 * Collector Trace Exporter for Web
 */
export class OTLPTraceExporter extends OTLPExporterBase {
    constructor(config = {}) {
        super(createLegacyOtlpBrowserExportDelegate(config, ProtobufTraceSerializer, DEFAULT_COLLECTOR_RESOURCE_PATH, { 'Content-Type': 'application/x-protobuf' }));
    }
}
//# sourceMappingURL=OTLPTraceExporter.js.map