/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag } from '@opentelemetry/api';
function isPartialSuccessResponse(response) {
    return Object.prototype.hasOwnProperty.call(response, 'partialSuccess');
}
/**
 * Default response handler that logs a partial success to the console.
 */
export function createLoggingPartialSuccessResponseHandler() {
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
            diag.warn('Received Partial Success response:', JSON.stringify(response.partialSuccess));
        },
    };
}
//# sourceMappingURL=logging-response-handler.js.map