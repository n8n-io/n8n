// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { delay } from "@azure/core-util";
import { Poller } from "@azure/core-lro";
/**
 * This is the poller returned by {@link BlobClient.beginCopyFromURL}.
 * This can not be instantiated directly outside of this package.
 *
 * @hidden
 */
export class BlobBeginCopyFromUrlPoller extends Poller {
    constructor(options) {
        const { blobClient, copySource, intervalInMs = 15000, onProgress, resumeFrom, startCopyFromURLOptions, } = options;
        let state;
        if (resumeFrom) {
            state = JSON.parse(resumeFrom).state;
        }
        const operation = makeBlobBeginCopyFromURLPollOperation(Object.assign(Object.assign({}, state), { blobClient,
            copySource,
            startCopyFromURLOptions }));
        super(operation);
        if (typeof onProgress === "function") {
            this.onProgress(onProgress);
        }
        this.intervalInMs = intervalInMs;
    }
    delay() {
        return delay(this.intervalInMs);
    }
}
/**
 * Note: Intentionally using function expression over arrow function expression
 * so that the function can be invoked with a different context.
 * This affects what `this` refers to.
 * @hidden
 */
const cancel = async function cancel(options = {}) {
    const state = this.state;
    const { copyId } = state;
    if (state.isCompleted) {
        return makeBlobBeginCopyFromURLPollOperation(state);
    }
    if (!copyId) {
        state.isCancelled = true;
        return makeBlobBeginCopyFromURLPollOperation(state);
    }
    // if abortCopyFromURL throws, it will bubble up to user's poller.cancelOperation call
    await state.blobClient.abortCopyFromURL(copyId, {
        abortSignal: options.abortSignal,
    });
    state.isCancelled = true;
    return makeBlobBeginCopyFromURLPollOperation(state);
};
/**
 * Note: Intentionally using function expression over arrow function expression
 * so that the function can be invoked with a different context.
 * This affects what `this` refers to.
 * @hidden
 */
const update = async function update(options = {}) {
    const state = this.state;
    const { blobClient, copySource, startCopyFromURLOptions } = state;
    if (!state.isStarted) {
        state.isStarted = true;
        const result = await blobClient.startCopyFromURL(copySource, startCopyFromURLOptions);
        // copyId is needed to abort
        state.copyId = result.copyId;
        if (result.copyStatus === "success") {
            state.result = result;
            state.isCompleted = true;
        }
    }
    else if (!state.isCompleted) {
        try {
            const result = await state.blobClient.getProperties({ abortSignal: options.abortSignal });
            const { copyStatus, copyProgress } = result;
            const prevCopyProgress = state.copyProgress;
            if (copyProgress) {
                state.copyProgress = copyProgress;
            }
            if (copyStatus === "pending" &&
                copyProgress !== prevCopyProgress &&
                typeof options.fireProgress === "function") {
                // trigger in setTimeout, or swallow error?
                options.fireProgress(state);
            }
            else if (copyStatus === "success") {
                state.result = result;
                state.isCompleted = true;
            }
            else if (copyStatus === "failed") {
                state.error = new Error(`Blob copy failed with reason: "${result.copyStatusDescription || "unknown"}"`);
                state.isCompleted = true;
            }
        }
        catch (err) {
            state.error = err;
            state.isCompleted = true;
        }
    }
    return makeBlobBeginCopyFromURLPollOperation(state);
};
/**
 * Note: Intentionally using function expression over arrow function expression
 * so that the function can be invoked with a different context.
 * This affects what `this` refers to.
 * @hidden
 */
const toString = function toString() {
    return JSON.stringify({ state: this.state }, (key, value) => {
        // remove blobClient from serialized state since a client can't be hydrated from this info.
        if (key === "blobClient") {
            return undefined;
        }
        return value;
    });
};
/**
 * Creates a poll operation given the provided state.
 * @hidden
 */
function makeBlobBeginCopyFromURLPollOperation(state) {
    return {
        state: Object.assign({}, state),
        cancel,
        toString,
        update,
    };
}
//# sourceMappingURL=BlobStartCopyFromUrlPoller.js.map