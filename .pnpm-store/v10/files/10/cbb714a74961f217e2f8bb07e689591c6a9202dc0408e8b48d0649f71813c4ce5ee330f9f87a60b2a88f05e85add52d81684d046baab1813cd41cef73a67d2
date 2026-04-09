"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCreatePoller = void 0;
const operation_js_1 = require("./operation.js");
const constants_js_1 = require("./constants.js");
const core_util_1 = require("@azure/core-util");
const createStateProxy = () => ({
    /**
     * The state at this point is created to be of type OperationState<TResult>.
     * It will be updated later to be of type TState when the
     * customer-provided callback, `updateState`, is called during polling.
     */
    initState: (config) => ({ status: "running", config }),
    setCanceled: (state) => (state.status = "canceled"),
    setError: (state, error) => (state.error = error),
    setResult: (state, result) => (state.result = result),
    setRunning: (state) => (state.status = "running"),
    setSucceeded: (state) => (state.status = "succeeded"),
    setFailed: (state) => (state.status = "failed"),
    getError: (state) => state.error,
    getResult: (state) => state.result,
    isCanceled: (state) => state.status === "canceled",
    isFailed: (state) => state.status === "failed",
    isRunning: (state) => state.status === "running",
    isSucceeded: (state) => state.status === "succeeded",
});
/**
 * Returns a poller factory.
 */
function buildCreatePoller(inputs) {
    const { getOperationLocation, getStatusFromInitialResponse, getStatusFromPollResponse, isOperationError, getResourceLocation, getPollingInterval, getError, resolveOnUnsuccessful, } = inputs;
    return async ({ init, poll }, options) => {
        const { processResult, updateState, withOperationLocation: withOperationLocationCallback, intervalInMs = constants_js_1.POLL_INTERVAL_IN_MS, restoreFrom, } = options || {};
        const stateProxy = createStateProxy();
        const withOperationLocation = withOperationLocationCallback
            ? (() => {
                let called = false;
                return (operationLocation, isUpdated) => {
                    if (isUpdated)
                        withOperationLocationCallback(operationLocation);
                    else if (!called)
                        withOperationLocationCallback(operationLocation);
                    called = true;
                };
            })()
            : undefined;
        const state = restoreFrom
            ? (0, operation_js_1.deserializeState)(restoreFrom)
            : await (0, operation_js_1.initOperation)({
                init,
                stateProxy,
                processResult,
                getOperationStatus: getStatusFromInitialResponse,
                withOperationLocation,
                setErrorAsResult: !resolveOnUnsuccessful,
            });
        let resultPromise;
        const abortController = new AbortController();
        const handlers = new Map();
        const handleProgressEvents = async () => handlers.forEach((h) => h(state));
        const cancelErrMsg = "Operation was canceled";
        let currentPollIntervalInMs = intervalInMs;
        const poller = {
            getOperationState: () => state,
            getResult: () => state.result,
            isDone: () => ["succeeded", "failed", "canceled"].includes(state.status),
            isStopped: () => resultPromise === undefined,
            stopPolling: () => {
                abortController.abort();
            },
            toString: () => JSON.stringify({
                state,
            }),
            onProgress: (callback) => {
                const s = Symbol();
                handlers.set(s, callback);
                return () => handlers.delete(s);
            },
            pollUntilDone: (pollOptions) => (resultPromise !== null && resultPromise !== void 0 ? resultPromise : (resultPromise = (async () => {
                const { abortSignal: inputAbortSignal } = pollOptions || {};
                // In the future we can use AbortSignal.any() instead
                function abortListener() {
                    abortController.abort();
                }
                const abortSignal = abortController.signal;
                if (inputAbortSignal === null || inputAbortSignal === void 0 ? void 0 : inputAbortSignal.aborted) {
                    abortController.abort();
                }
                else if (!abortSignal.aborted) {
                    inputAbortSignal === null || inputAbortSignal === void 0 ? void 0 : inputAbortSignal.addEventListener("abort", abortListener, { once: true });
                }
                try {
                    if (!poller.isDone()) {
                        await poller.poll({ abortSignal });
                        while (!poller.isDone()) {
                            await (0, core_util_1.delay)(currentPollIntervalInMs, { abortSignal });
                            await poller.poll({ abortSignal });
                        }
                    }
                }
                finally {
                    inputAbortSignal === null || inputAbortSignal === void 0 ? void 0 : inputAbortSignal.removeEventListener("abort", abortListener);
                }
                if (resolveOnUnsuccessful) {
                    return poller.getResult();
                }
                else {
                    switch (state.status) {
                        case "succeeded":
                            return poller.getResult();
                        case "canceled":
                            throw new Error(cancelErrMsg);
                        case "failed":
                            throw state.error;
                        case "notStarted":
                        case "running":
                            throw new Error(`Polling completed without succeeding or failing`);
                    }
                }
            })().finally(() => {
                resultPromise = undefined;
            }))),
            async poll(pollOptions) {
                if (resolveOnUnsuccessful) {
                    if (poller.isDone())
                        return;
                }
                else {
                    switch (state.status) {
                        case "succeeded":
                            return;
                        case "canceled":
                            throw new Error(cancelErrMsg);
                        case "failed":
                            throw state.error;
                    }
                }
                await (0, operation_js_1.pollOperation)({
                    poll,
                    state,
                    stateProxy,
                    getOperationLocation,
                    isOperationError,
                    withOperationLocation,
                    getPollingInterval,
                    getOperationStatus: getStatusFromPollResponse,
                    getResourceLocation,
                    processResult,
                    getError,
                    updateState,
                    options: pollOptions,
                    setDelay: (pollIntervalInMs) => {
                        currentPollIntervalInMs = pollIntervalInMs;
                    },
                    setErrorAsResult: !resolveOnUnsuccessful,
                });
                await handleProgressEvents();
                if (!resolveOnUnsuccessful) {
                    switch (state.status) {
                        case "canceled":
                            throw new Error(cancelErrMsg);
                        case "failed":
                            throw state.error;
                    }
                }
            },
        };
        return poller;
    };
}
exports.buildCreatePoller = buildCreatePoller;
//# sourceMappingURL=poller.js.map