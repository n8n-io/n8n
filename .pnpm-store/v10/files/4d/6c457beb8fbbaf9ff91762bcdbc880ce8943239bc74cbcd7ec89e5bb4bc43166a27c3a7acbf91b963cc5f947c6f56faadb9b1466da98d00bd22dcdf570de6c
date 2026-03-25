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