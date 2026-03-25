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
    const { cleanupBeforeAbort, abortSignal, abortErrorMsg } = options !== null && options !== void 0 ? options : {};
    return new Promise((resolve, reject) => {
        function rejectOnAbort() {
            reject(new abort_controller_1.AbortError(abortErrorMsg !== null && abortErrorMsg !== void 0 ? abortErrorMsg : "The operation was aborted."));
        }
        function removeListeners() {
            abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.removeEventListener("abort", onAbort);
        }
        function onAbort() {
            cleanupBeforeAbort === null || cleanupBeforeAbort === void 0 ? void 0 : cleanupBeforeAbort();
            removeListeners();
            rejectOnAbort();
        }
        if (abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.aborted) {
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
        abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.addEventListener("abort", onAbort);
    });
}
//# sourceMappingURL=createAbortablePromise.js.map