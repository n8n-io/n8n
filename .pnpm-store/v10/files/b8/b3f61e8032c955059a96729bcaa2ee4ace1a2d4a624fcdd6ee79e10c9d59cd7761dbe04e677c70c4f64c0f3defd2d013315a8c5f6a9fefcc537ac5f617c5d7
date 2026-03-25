// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AbortController } from "@azure/abort-controller";
import { deserializeState, initOperation, pollOperation } from "./operation";
import { POLL_INTERVAL_IN_MS } from "./constants";
import { delayMs } from "./util/delayMs";
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
export function buildCreatePoller(inputs) {
    const { getOperationLocation, getStatusFromInitialResponse, getStatusFromPollResponse, getResourceLocation, getPollingInterval, resolveOnUnsuccessful, } = inputs;
    return async ({ init, poll }, options) => {
        const { processResult, updateState, withOperationLocation: withOperationLocationCallback, intervalInMs = POLL_INTERVAL_IN_MS, restoreFrom, } = options || {};
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
            ? deserializeState(restoreFrom)
            : await initOperation({
                init,
                stateProxy,
                processResult,
                getOperationStatus: getStatusFromInitialResponse,
                withOperationLocation,
                setErrorAsResult: !resolveOnUnsuccessful,
            });
        let resultPromise;
        let cancelJob;
        const abortController = new AbortController();
        const handlers = new Map();
        const handleProgressEvents = async () => handlers.forEach((h) => h(state));
        let currentPollIntervalInMs = intervalInMs;
        const poller = {
            getOperationState: () => state,
            getResult: () => state.result,
            isDone: () => ["succeeded", "failed", "canceled"].includes(state.status),
            isStopped: () => resultPromise === undefined,
            stopPolling: () => {
                abortController.abort();
                cancelJob === null || cancelJob === void 0 ? void 0 : cancelJob();
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
                const { signal: abortSignal } = inputAbortSignal
                    ? new AbortController([inputAbortSignal, abortController.signal])
                    : abortController;
                if (!poller.isDone()) {
                    await poller.poll({ abortSignal });
                    while (!poller.isDone()) {
                        const delay = delayMs(currentPollIntervalInMs);
                        cancelJob = delay.cancel;
                        await delay;
                        await poller.poll({ abortSignal });
                    }
                }
                switch (state.status) {
                    case "succeeded": {
                        return poller.getResult();
                    }
                    case "canceled": {
                        if (!resolveOnUnsuccessful)
                            throw new Error("Operation was canceled");
                        return poller.getResult();
                    }
                    case "failed": {
                        if (!resolveOnUnsuccessful)
                            throw state.error;
                        return poller.getResult();
                    }
                    case "notStarted":
                    case "running": {
                        // Unreachable
                        throw new Error(`polling completed without succeeding or failing`);
                    }
                }
            })().finally(() => {
                resultPromise = undefined;
            }))),
            async poll(pollOptions) {
                await pollOperation({
                    poll,
                    state,
                    stateProxy,
                    getOperationLocation,
                    withOperationLocation,
                    getPollingInterval,
                    getOperationStatus: getStatusFromPollResponse,
                    getResourceLocation,
                    processResult,
                    updateState,
                    options: pollOptions,
                    setDelay: (pollIntervalInMs) => {
                        currentPollIntervalInMs = pollIntervalInMs;
                    },
                    setErrorAsResult: !resolveOnUnsuccessful,
                });
                await handleProgressEvents();
                if (state.status === "canceled" && !resolveOnUnsuccessful) {
                    throw new Error("Operation was canceled");
                }
                if (state.status === "failed" && !resolveOnUnsuccessful) {
                    throw state.error;
                }
            },
        };
        return poller;
    };
}
//# sourceMappingURL=poller.js.map