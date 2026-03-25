// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { defaultRetryPolicyName as tspDefaultRetryPolicyName, defaultRetryPolicy as tspDefaultRetryPolicy, } from "@typespec/ts-http-runtime/internal/policies";
/**
 * Name of the {@link defaultRetryPolicy}
 */
export const defaultRetryPolicyName = tspDefaultRetryPolicyName;
/**
 * A policy that retries according to three strategies:
 * - When the server sends a 429 response with a Retry-After header.
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
 */
export function defaultRetryPolicy(options = {}) {
    return tspDefaultRetryPolicy(options);
}
//# sourceMappingURL=defaultRetryPolicy.js.map