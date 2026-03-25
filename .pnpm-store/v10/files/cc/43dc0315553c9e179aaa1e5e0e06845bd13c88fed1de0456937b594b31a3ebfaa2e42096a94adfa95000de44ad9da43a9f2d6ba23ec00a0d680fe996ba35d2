"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttlingRetryPolicyName = void 0;
exports.throttlingRetryPolicy = throttlingRetryPolicy;
const policies_1 = require("@typespec/ts-http-runtime/internal/policies");
/**
 * Name of the {@link throttlingRetryPolicy}
 */
exports.throttlingRetryPolicyName = policies_1.throttlingRetryPolicyName;
/**
 * A policy that retries when the server sends a 429 response with a Retry-After header.
 *
 * To learn more, please refer to
 * https://learn.microsoft.com/en-us/azure/azure-resource-manager/resource-manager-request-limits,
 * https://learn.microsoft.com/en-us/azure/azure-subscription-service-limits and
 * https://learn.microsoft.com/en-us/azure/virtual-machines/troubleshooting/troubleshooting-throttling-errors
 *
 * @param options - Options that configure retry logic.
 */
function throttlingRetryPolicy(options = {}) {
    return (0, policies_1.throttlingRetryPolicy)(options);
}
//# sourceMappingURL=throttlingRetryPolicy.js.map