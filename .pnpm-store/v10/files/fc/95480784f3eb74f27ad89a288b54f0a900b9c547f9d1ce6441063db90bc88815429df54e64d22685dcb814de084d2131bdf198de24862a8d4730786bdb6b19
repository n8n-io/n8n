"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultHttpClient = createDefaultHttpClient;
const ts_http_runtime_1 = require("@typespec/ts-http-runtime");
const wrapAbortSignal_js_1 = require("./util/wrapAbortSignal.js");
/**
 * Create the correct HttpClient for the current environment.
 */
function createDefaultHttpClient() {
    const client = (0, ts_http_runtime_1.createDefaultHttpClient)();
    return {
        async sendRequest(request) {
            // we wrap any AbortSignalLike here since the TypeSpec runtime expects a native AbortSignal.
            // 99% of the time, this should be a no-op since a native AbortSignal is passed in.
            const { abortSignal, cleanup } = request.abortSignal
                ? (0, wrapAbortSignal_js_1.wrapAbortSignalLike)(request.abortSignal)
                : {};
            try {
                // eslint-disable-next-line no-param-reassign
                request.abortSignal = abortSignal;
                return await client.sendRequest(request);
            }
            finally {
                cleanup === null || cleanup === void 0 ? void 0 : cleanup();
            }
        },
    };
}
//# sourceMappingURL=defaultHttpClient.js.map