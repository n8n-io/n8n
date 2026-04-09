"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOtlpNetworkExportDelegate = void 0;
const bounded_queue_export_promise_handler_1 = require("./bounded-queue-export-promise-handler");
const otlp_export_delegate_1 = require("./otlp-export-delegate");
function createOtlpNetworkExportDelegate(options, serializer, transport) {
    return (0, otlp_export_delegate_1.createOtlpExportDelegate)({
        transport: transport,
        serializer,
        promiseHandler: (0, bounded_queue_export_promise_handler_1.createBoundedQueueExportPromiseHandler)(options),
    }, { timeout: options.timeoutMillis });
}
exports.createOtlpNetworkExportDelegate = createOtlpNetworkExportDelegate;
//# sourceMappingURL=otlp-network-export-delegate.js.map