// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { HeaderConstants } from "../utils/constants";
/**
 * The programmatic identifier of the storageCorrectContentLengthPolicy.
 */
export const storageCorrectContentLengthPolicyName = "StorageCorrectContentLengthPolicy";
/**
 * storageCorrectContentLengthPolicy to correctly set Content-Length header with request body length.
 */
export function storageCorrectContentLengthPolicy() {
    function correctContentLength(request) {
        if (request.body &&
            (typeof request.body === "string" || Buffer.isBuffer(request.body)) &&
            request.body.length > 0) {
            request.headers.set(HeaderConstants.CONTENT_LENGTH, Buffer.byteLength(request.body));
        }
    }
    return {
        name: storageCorrectContentLengthPolicyName,
        async sendRequest(request, next) {
            correctContentLength(request);
            return next(request);
        },
    };
}
//# sourceMappingURL=StorageCorrectContentLengthPolicy.js.map