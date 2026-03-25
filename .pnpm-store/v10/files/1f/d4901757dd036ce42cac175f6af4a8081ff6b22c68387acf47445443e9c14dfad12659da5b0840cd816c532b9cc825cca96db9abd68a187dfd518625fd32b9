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
exports.OTLPTraceExporter = void 0;
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const version_1 = require("../../version");
const node_http_1 = require("@opentelemetry/otlp-exporter-base/node-http");
/**
 * Collector Trace Exporter for Node with protobuf
 */
class OTLPTraceExporter extends otlp_exporter_base_1.OTLPExporterBase {
    constructor(config = {}) {
        super((0, node_http_1.createOtlpHttpExportDelegate)((0, node_http_1.convertLegacyHttpOptions)(config, 'TRACES', 'v1/traces', {
            'User-Agent': `OTel-OTLP-Exporter-JavaScript/${version_1.VERSION}`,
            'Content-Type': 'application/x-protobuf',
        }), otlp_transformer_1.ProtobufTraceSerializer));
    }
}
exports.OTLPTraceExporter = OTLPTraceExporter;
//# sourceMappingURL=OTLPTraceExporter.js.map