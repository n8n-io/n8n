"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoggingPartialSuccessResponseHandler = void 0;
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
const api_1 = require("@opentelemetry/api");
function isPartialSuccessResponse(response) {
    return Object.prototype.hasOwnProperty.call(response, 'partialSuccess');
}
/**
 * Default response handler that logs a partial success to the console.
 */
function createLoggingPartialSuccessResponseHandler() {
    return {
        handleResponse(response) {
            // Partial success MUST never be an empty object according the specification
            // see https://opentelemetry.io/docs/specs/otlp/#partial-success
            if (response == null ||
                !isPartialSuccessResponse(response) ||
                response.partialSuccess == null ||
                Object.keys(response.partialSuccess).length === 0) {
                return;
            }
            api_1.diag.warn('Received Partial Success response:', JSON.stringify(response.partialSuccess));
        },
    };
}
exports.createLoggingPartialSuccessResponseHandler = createLoggingPartialSuccessResponseHandler;
//# sourceMappingURL=logging-response-handler.js.map