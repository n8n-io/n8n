"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
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
        userAgent: options.userAgent,
        grpcName,
        grpcPath,
    }));
}
exports.createOtlpGrpcExportDelegate = createOtlpGrpcExportDelegate;
//# sourceMappingURL=otlp-grpc-export-delegate.js.map