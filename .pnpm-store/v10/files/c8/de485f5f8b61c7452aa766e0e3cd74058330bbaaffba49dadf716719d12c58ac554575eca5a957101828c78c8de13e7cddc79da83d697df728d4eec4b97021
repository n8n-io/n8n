// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { logger as coreLogger } from "../log.js";
import { Sanitizer } from "../util/sanitizer.js";
/**
 * The programmatic identifier of the logPolicy.
 */
export const logPolicyName = "logPolicy";
/**
 * A policy that logs all requests and responses.
 * @param options - Options to configure logPolicy.
 */
export function logPolicy(options = {}) {
    var _a;
    const logger = (_a = options.logger) !== null && _a !== void 0 ? _a : coreLogger.info;
    const sanitizer = new Sanitizer({
        additionalAllowedHeaderNames: options.additionalAllowedHeaderNames,
        additionalAllowedQueryParameters: options.additionalAllowedQueryParameters,
    });
    return {
        name: logPolicyName,
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