"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOtlpHttpExportDelegate = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const otlp_export_delegate_1 = require("./otlp-export-delegate");
const http_exporter_transport_1 = require("./transport/http-exporter-transport");
const bounded_queue_export_promise_handler_1 = require("./bounded-queue-export-promise-handler");
const retrying_transport_1 = require("./retrying-transport");
function createOtlpHttpExportDelegate(options, serializer) {
    return (0, otlp_export_delegate_1.createOtlpExportDelegate)({
        transport: (0, retrying_transport_1.createRetryingTransport)({
            transport: (0, http_exporter_transport_1.createHttpExporterTransport)(options),
        }),
        serializer: serializer,
        promiseHandler: (0, bounded_queue_export_promise_handler_1.createBoundedQueueExportPromiseHandler)(options),
    }, { timeout: options.timeoutMillis });
}
exports.createOtlpHttpExportDelegate = createOtlpHttpExportDelegate;
//# sourceMappingURL=otlp-http-export-delegate.js.map