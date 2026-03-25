"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapAbortSignalLike = wrapAbortSignalLike;
/**
 * Creates a native AbortSignal which reflects the state of the provided AbortSignalLike.
 * If the AbortSignalLike is already a native AbortSignal, it is returned as is.
 * @param abortSignalLike - The AbortSignalLike to wrap.
 * @returns - An object containing the native AbortSignal and an optional cleanup function. The cleanup function should be called when the AbortSignal is no longer needed.
 */
function wrapAbortSignalLike(abortSignalLike) {
    if (abortSignalLike instanceof AbortSignal) {
        return { abortSignal: abortSignalLike };
    }
    if (abortSignalLike.aborted) {
        return { abortSignal: AbortSignal.abort(abortSignalLike.reason) };
    }
    const controller = new AbortController();
    let needsCleanup = true;
    function cleanup() {
        if (needsCleanup) {
            abortSignalLike.removeEventListener("abort", listener);
            needsCleanup = false;
        }
    }
    function listener() {
        controller.abort(abortSignalLike.reason);
        cleanup();
    }
    abortSignalLike.addEventListener("abort", listener);
    return { abortSignal: controller.signal, cleanup };
}
//# sourceMappingURL=wrapAbortSignal.js.map