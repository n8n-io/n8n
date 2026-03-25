"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelablePromiseRace = cancelablePromiseRace;
/**
 * promise.race() wrapper that aborts rest of promises as soon as the first promise settles.
 */
async function cancelablePromiseRace(abortablePromiseBuilders, options) {
    const aborter = new AbortController();
    function abortHandler() {
        aborter.abort();
    }
    options?.abortSignal?.addEventListener("abort", abortHandler);
    try {
        return await Promise.race(abortablePromiseBuilders.map((p) => p({ abortSignal: aborter.signal })));
    }
    finally {
        aborter.abort();
        options?.abortSignal?.removeEventListener("abort", abortHandler);
    }
}
//# sourceMappingURL=aborterUtils.js.map