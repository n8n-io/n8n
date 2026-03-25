"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.multipartPolicyName = void 0;
exports.multipartPolicy = multipartPolicy;
const policies_1 = require("@typespec/ts-http-runtime/internal/policies");
const file_js_1 = require("../util/file.js");
/**
 * Name of multipart policy
 */
exports.multipartPolicyName = policies_1.multipartPolicyName;
/**
 * Pipeline policy for multipart requests
 */
function multipartPolicy() {
    const tspPolicy = (0, policies_1.multipartPolicy)();
    return {
        name: exports.multipartPolicyName,
        sendRequest: async (request, next) => {
            if (request.multipartBody) {
                for (const part of request.multipartBody.parts) {
                    if ((0, file_js_1.hasRawContent)(part.body)) {
                        part.body = (0, file_js_1.getRawContent)(part.body);
                    }
                }
            }
            return tspPolicy.sendRequest(request, next);
        },
    };
}
//# sourceMappingURL=multipartPolicy.js.map