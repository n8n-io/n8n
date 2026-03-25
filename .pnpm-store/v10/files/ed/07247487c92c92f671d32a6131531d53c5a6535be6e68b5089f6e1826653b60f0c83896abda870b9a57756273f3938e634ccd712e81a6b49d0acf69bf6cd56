"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAbortablePromise = createAbortablePromise;
const abort_controller_1 = require("@azure/abort-controller");
/**
 * Creates an abortable promise.
 * @param buildPromise - A function that takes the resolve and reject functions as parameters.
 * @param options - The options for the abortable promise.
 * @returns A promise that can be aborted.
 */
function createAbortablePromise(buildPromise, options) {
    const { cleanupBeforeAbort, abortSignal, abortErrorMsg } = options ?? {};
    return new Promise((resolve, reject) => {
        function rejectOnAbort() {
            reject(new abort_controller_1.AbortError(abortErrorMsg ?? "The operation was aborted."));
        }
        function removeListeners() {
            abortSignal?.removeEventListener("abort", onAbort);
        }
        function onAbort() {
            cleanupBeforeAbort?.();
            removeListeners();
            rejectOnAbort();
        }
        if (abortSignal?.aborted) {
            return rejectOnAbort();
        }
        try {
            buildPromise((x) => {
                removeListeners();
                resolve(x);
            }, (x) => {
                removeListeners();
                reject(x);
            });
        }
        catch (err) {
            reject(err);
        }
        abortSignal?.addEventListener("abort", onAbort);
    });
}
//# sourceMappingURL=createAbortablePromise.js.map