// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { multipartPolicyName as tspMultipartPolicyName, multipartPolicy as tspMultipartPolicy, } from "@typespec/ts-http-runtime/internal/policies";
import { getRawContent, hasRawContent } from "../util/file.js";
/**
 * Name of multipart policy
 */
export const multipartPolicyName = tspMultipartPolicyName;
/**
 * Pipeline policy for multipart requests
 */
export function multipartPolicy() {
    const tspPolicy = tspMultipartPolicy();
    return {
        name: multipartPolicyName,
        sendRequest: async (request, next) => {
            if (request.multipartBody) {
                for (const part of request.multipartBody.parts) {
                    if (hasRawContent(part.body)) {
                        part.body = getRawContent(part.body);
                    }
                }
            }
            return tspPolicy.sendRequest(request, next);
        },
    };
}
//# sourceMappingURL=multipartPolicy.js.map