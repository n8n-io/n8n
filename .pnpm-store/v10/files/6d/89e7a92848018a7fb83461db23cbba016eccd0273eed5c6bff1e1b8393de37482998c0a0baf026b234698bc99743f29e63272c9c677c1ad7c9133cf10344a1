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
exports.OTLPLogExporter = void 0;
const otlp_grpc_exporter_base_1 = require("@opentelemetry/otlp-grpc-exporter-base");
const otlp_transformer_1 = require("@opentelemetry/otlp-transformer");
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
/**
 * OTLP Logs Exporter for Node
 */
class OTLPLogExporter extends otlp_exporter_base_1.OTLPExporterBase {
    constructor(config = {}) {
        super((0, otlp_grpc_exporter_base_1.createOtlpGrpcExportDelegate)((0, otlp_grpc_exporter_base_1.convertLegacyOtlpGrpcOptions)(config, 'LOGS'), otlp_transformer_1.ProtobufLogsSerializer, 'LogsExportService', '/opentelemetry.proto.collector.logs.v1.LogsService/Export'));
    }
}
exports.OTLPLogExporter = OTLPLogExporter;
//# sourceMappingURL=OTLPLogExporter.js.map