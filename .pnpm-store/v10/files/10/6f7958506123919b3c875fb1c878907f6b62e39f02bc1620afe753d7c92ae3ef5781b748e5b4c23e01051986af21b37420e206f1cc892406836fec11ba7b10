"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ndJsonPolicyName = void 0;
exports.ndJsonPolicy = ndJsonPolicy;
/**
 * The programmatic identifier of the ndJsonPolicy.
 */
exports.ndJsonPolicyName = "ndJsonPolicy";
/**
 * ndJsonPolicy is a policy used to control keep alive settings for every request.
 */
function ndJsonPolicy() {
    return {
        name: exports.ndJsonPolicyName,
        async sendRequest(request, next) {
            // There currently isn't a good way to bypass the serializer
            if (typeof request.body === "string" && request.body.startsWith("[")) {
                const body = JSON.parse(request.body);
                if (Array.isArray(body)) {
                    request.body = body.map((item) => JSON.stringify(item) + "\n").join("");
                }
            }
            return next(request);
        },
    };
}
//# sourceMappingURL=ndJsonPolicy.js.map