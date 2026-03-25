// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { logger as coreLogger } from "../log.js";
import { logPolicyName as tspLogPolicyName, logPolicy as tspLogPolicy, } from "@typespec/ts-http-runtime/internal/policies";
/**
 * The programmatic identifier of the logPolicy.
 */
export const logPolicyName = tspLogPolicyName;
/**
 * A policy that logs all requests and responses.
 * @param options - Options to configure logPolicy.
 */
export function logPolicy(options = {}) {
    return tspLogPolicy(Object.assign({ logger: coreLogger.info }, options));
}
//# sourceMappingURL=logPolicy.js.map