"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOtlpHttpExportDelegate = void 0;
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