"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapAbortSignalLikePolicyName = void 0;
exports.wrapAbortSignalLikePolicy = wrapAbortSignalLikePolicy;
const wrapAbortSignal_js_1 = require("../util/wrapAbortSignal.js");
exports.wrapAbortSignalLikePolicyName = "wrapAbortSignalLikePolicy";
/**
 * Policy that ensure that any AbortSignalLike is wrapped in a native AbortSignal for processing by the pipeline.
 * Since the ts-http-runtime expects a native AbortSignal, this policy is used to ensure that any AbortSignalLike is wrapped in a native AbortSignal.
 *
 * @returns - created policy
 */
function wrapAbortSignalLikePolicy() {
    return {
        name: exports.wrapAbortSignalLikePolicyName,
        sendRequest: async (request, next) => {
            if (!request.abortSignal) {
                return next(request);
            }
            const { abortSignal, cleanup } = (0, wrapAbortSignal_js_1.wrapAbortSignalLike)(request.abortSignal);
            // eslint-disable-next-line no-param-reassign
            request.abortSignal = abortSignal;
            try {
                return await next(request);
            }
            finally {
                cleanup === null || cleanup === void 0 ? void 0 : cleanup();
            }
        },
    };
}
//# sourceMappingURL=wrapAbortSignalLikePolicy.js.map