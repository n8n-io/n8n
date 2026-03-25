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
exports.createOtlpGrpcExportDelegate = void 0;
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
const grpc_exporter_transport_1 = require("./grpc-exporter-transport");
function createOtlpGrpcExportDelegate(options, serializer, grpcName, grpcPath) {
    return (0, otlp_exporter_base_1.createOtlpNetworkExportDelegate)(options, serializer, (0, grpc_exporter_transport_1.createOtlpGrpcExporterTransport)({
        address: options.url,
        compression: options.compression,
        credentials: options.credentials,
        metadata: options.metadata,
        grpcName,
        grpcPath,
    }));
}
exports.createOtlpGrpcExportDelegate = createOtlpGrpcExportDelegate;
//# sourceMappingURL=otlp-grpc-export-delegate.js.map