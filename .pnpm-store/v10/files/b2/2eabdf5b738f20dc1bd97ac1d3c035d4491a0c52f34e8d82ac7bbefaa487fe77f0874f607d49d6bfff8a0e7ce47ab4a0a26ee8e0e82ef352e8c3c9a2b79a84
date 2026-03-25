// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createDefaultHttpClient as tspCreateDefaultHttpClient } from "@typespec/ts-http-runtime";
import { wrapAbortSignalLike } from "./util/wrapAbortSignal.js";
/**
 * Create the correct HttpClient for the current environment.
 */
export function createDefaultHttpClient() {
    const client = tspCreateDefaultHttpClient();
    return {
        async sendRequest(request) {
            // we wrap any AbortSignalLike here since the TypeSpec runtime expects a native AbortSignal.
            // 99% of the time, this should be a no-op since a native AbortSignal is passed in.
            const { abortSignal, cleanup } = request.abortSignal
                ? wrapAbortSignalLike(request.abortSignal)
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