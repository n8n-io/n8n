"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPolicyName = void 0;
exports.logPolicy = logPolicy;
const log_js_1 = require("../log.js");
const sanitizer_js_1 = require("../util/sanitizer.js");
/**
 * The programmatic identifier of the logPolicy.
 */
exports.logPolicyName = "logPolicy";
/**
 * A policy that logs all requests and responses.
 * @param options - Options to configure logPolicy.
 */
function logPolicy(options = {}) {
    const logger = options.logger ?? log_js_1.logger.info;
    const sanitizer = new sanitizer_js_1.Sanitizer({
        additionalAllowedHeaderNames: options.additionalAllowedHeaderNames,
        additionalAllowedQueryParameters: options.additionalAllowedQueryParameters,
    });
    return {
        name: exports.logPolicyName,
        async sendRequest(request, next) {
            if (!logger.enabled) {
                return next(request);
            }
            logger(`Request: ${sanitizer.sanitize(request)}`);
            const response = await next(request);
            logger(`Response status code: ${response.status}`);
            logger(`Headers: ${sanitizer.sanitize(response.headers)}`);
            return response;
        },
    };
}
//# sourceMappingURL=logPolicy.js.map