"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPolicyName = void 0;
exports.logPolicy = logPolicy;
const log_js_1 = require("../log.js");
const policies_1 = require("@typespec/ts-http-runtime/internal/policies");
/**
 * The programmatic identifier of the logPolicy.
 */
exports.logPolicyName = policies_1.logPolicyName;
/**
 * A policy that logs all requests and responses.
 * @param options - Options to configure logPolicy.
 */
function logPolicy(options = {}) {
    return (0, policies_1.logPolicy)(Object.assign({ logger: log_js_1.logger.info }, options));
}
//# sourceMappingURL=logPolicy.js.map