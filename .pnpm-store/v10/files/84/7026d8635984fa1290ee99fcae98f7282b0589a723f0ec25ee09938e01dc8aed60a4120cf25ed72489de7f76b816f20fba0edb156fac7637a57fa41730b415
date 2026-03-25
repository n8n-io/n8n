'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var logger$1 = require('@azure/logger');
var abortController = require('@azure/abort-controller');

// Copyright (c) Microsoft Corporation.
/**
 * The `@azure/logger` configuration for this package.
 * @internal
 */
const logger = logger$1.createClientLogger("core-lro");

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * The default time interval to wait before sending the next polling request.
 */
const POLL_INTERVAL_IN_MS = 2000;
/**
 * The closed set of terminal states.
 */
const terminalStates = ["succeeded", "canceled", "failed"];

// Copyright (c) Microsoft Corporation.
/**
 * Deserializes the state
 */
function deserializeState(serializedState) {
    try {
        return JSON.parse(serializedState).state;
    }
    catch (e) {
        throw new Error(`Unable to deserialize input state: ${serializedState}`);
    }
}
function setStateError(inputs) {
    const { state, stateProxy } = inputs;
    return (error) => {
        stateProxy.setError(state, error);
        stateProxy.setFailed(state);
        throw error;
    };
}
function processOperationStatus(result) {
    const { state, stateProxy, status, isDone, processResult, response, setErrorAsResult } = result;
    switch (status) {
        case "succeeded": {
            stateProxy.setSucceeded(state);
            break;
        }
        case "failed": {
            stateProxy.setError(state, new Error(`The long-running operation has failed`));
            stateProxy.setFailed(state);
            break;
        }
        case "canceled": {
            stateProxy.setCanceled(state);
            break;
        }
    }
    if ((isDone === null || isDone === void 0 ? void 0 : isDone(response, state)) ||
        (isDone === undefined &&
            ["succeeded", "canceled"].concat(setErrorAsResult ? [] : ["failed"]).includes(status))) {
        stateProxy.setResult(state, buildResult({
            response,
            state,
            processResult,
        }));
    }
}
function buildResult(inputs) {
    const { processResult, response, state } = inputs;
    return processResult ? processResult(response, state) : response;
}
/**
 * Initiates the long-running operation.
 */
async function initOperation(inputs) {
    const { init, stateProxy, processResult, getOperationStatus, withOperationLocation, setErrorAsResult, } = inputs;
    const { operationLocation, resourceLocation, metadata, response } = await init();
    if (operationLocation)
        withOperationLocation === null || withOperationLocation === void 0 ? void 0 : withOperationLocation(operationLocation, false);
    const config = {
        metadata,
        operationLocation,
        resourceLocation,
    };
    logger.verbose(`LRO: Operation description:`, config);
    const state = stateProxy.initState(config);
    const status = getOperationStatus({ response, state, operationLocation });
    processOperationStatus({ state, status, stateProxy, response, setErrorAsResult, processResult });
    return state;
}
async function pollOperationHelper(inputs) {
    const { poll, state, stateProxy, operationLocation, getOperationStatus, getResourceLocation, options, } = inputs;
    const response = await poll(operationLocation, options).catch(setStateError({
        state,
        stateProxy,
    }));
    const status = getOperationStatus(response, state);
    logger.verbose(`LRO: Status:\n\tPolling from: ${state.config.operationLocation}\n\tOperation status: ${status}\n\tPolling status: ${terminalStates.includes(status) ? "Stopped" : "Running"}`);
    if (status === "succeeded") {
        const resourceLocation = getResourceLocation(response, state);
        if (resourceLocation !== undefined) {
            return {
                response: await poll(resourceLocation).catch(setStateError({ state, stateProxy })),
                status,
            };
        }
    }
    return { response, status };
}
/** Polls the long-running operation. */
async function pollOperation(inputs) {
    const { poll, state, stateProxy, options, getOperationStatus, getResourceLocation, getOperationLocation, withOperationLocation, getPollingInterval, processResult, updateState, setDelay, isDone, setErrorAsResult, } = inputs;
    const { operationLocation } = state.config;
    if (operationLocation !== undefined) {
        const { response, status } = await pollOperationHelper({
            poll,
            getOperationStatus,
            state,
            stateProxy,
            operationLocation,
            getResourceLocation,
            options,
        });
        processOperationStatus({
            status,
            response,
            state,
            stateProxy,
            isDone,
            processResult,
            setErrorAsResult,
        });
        if (!terminalStates.includes(status)) {
            const intervalInMs = getPollingInterval === null || getPollingInterval === void 0 ? void 0 : getPollingInterval(response);
            if (intervalInMs)
                setDelay(intervalInMs);
            const location = getOperationLocation === null || getOperationLocation === void 0 ? void 0 : getOperationLocation(response, state);
            if (location !== undefined) {
                const isUpdated = operationLocation !== location;
                state.config.operationLocation = location;
                withOperationLocation === null || withOperationLocation === void 0 ? void 0 : withOperationLocation(location, isUpdated);
            }
            else
                withOperationLocation === null || withOperationLocation === void 0 ? void 0 : withOperationLocation(operationLocation, false);
        }
        updateState === null || updateState === void 0 ? void 0 : updateState(state, response);
    }
}

// Copyright (c) Microsoft Corporation.
function getOperationLocationPollingUrl(inputs) {
    const { azureAsyncOperation, operationLocation } = inputs;
    return operationLocation !== null && operationLocation !== void 0 ? operationLocation : azureAsyncOperation;
}
function getLocationHeader(rawResponse) {
    return rawResponse.headers["location"];
}
function getOperationLocationHeader(rawResponse) {
    return rawResponse.headers["operation-location"];
}
function getAzureAsyncOperationHeader(rawResponse) {
    return rawResponse.headers["azure-asyncoperation"];
}
function findResourceLocation(inputs) {
    const { location, requestMethod, requestPath, resourceLocationConfig } = inputs;
    switch (requestMethod) {
        case "PUT": {
            return requestPath;
        }
        case "DELETE": {
            return undefined;
        }
        default: {
            switch (resourceLocationConfig) {
                case "azure-async-operation": {
                    return undefined;
                }
                case "original-uri": {
                    return requestPath;
                }
                case "location":
                default: {
                    return location;
                }
            }
        }
    }
}
function inferLroMode(inputs) {
    const { rawResponse, requestMethod, requestPath, resourceLocationConfig } = inputs;
    const operationLocation = getOperationLocationHeader(rawResponse);
    const azureAsyncOperation = getAzureAsyncOperationHeader(rawResponse);
    const pollingUrl = getOperationLocationPollingUrl({ operationLocation, azureAsyncOperation });
    const location = getLocationHeader(rawResponse);
    const normalizedRequestMethod = requestMethod === null || requestMethod === void 0 ? void 0 : requestMethod.toLocaleUpperCase();
    if (pollingUrl !== undefined) {
        return {
            mode: "OperationLocation",
            operationLocation: pollingUrl,
            resourceLocation: findResourceLocation({
                requestMethod: normalizedRequestMethod,
                location,
                requestPath,
                resourceLocationConfig,
            }),
        };
    }
    else if (location !== undefined) {
        return {
            mode: "ResourceLocation",
            operationLocation: location,
        };
    }
    else if (normalizedRequestMethod === "PUT" && requestPath) {
        return {
            mode: "Body",
            operationLocation: requestPath,
        };
    }
    else {
        return undefined;
    }
}
function transformStatus(inputs) {
    const { status, statusCode } = inputs;
    if (typeof status !== "string" && status !== undefined) {
        throw new Error(`Polling was unsuccessful. Expected status to have a string value or no value but it has instead: ${status}. This doesn't necessarily indicate the operation has failed. Check your Azure subscription or resource status for more information.`);
    }
    switch (status === null || status === void 0 ? void 0 : status.toLocaleLowerCase()) {
        case undefined:
            return toOperationStatus(statusCode);
        case "succeeded":
            return "succeeded";
        case "failed":
            return "failed";
        case "running":
        case "accepted":
        case "started":
        case "canceling":
        case "cancelling":
            return "running";
        case "canceled":
        case "cancelled":
            return "canceled";
        default: {
            logger.warning(`LRO: unrecognized operation status: ${status}`);
            return status;
        }
    }
}
function getStatus(rawResponse) {
    var _a;
    const { status } = (_a = rawResponse.body) !== null && _a !== void 0 ? _a : {};
    return transformStatus({ status, statusCode: rawResponse.statusCode });
}
function getProvisioningState(rawResponse) {
    var _a, _b;
    const { properties, provisioningState } = (_a = rawResponse.body) !== null && _a !== void 0 ? _a : {};
    const status = (_b = properties === null || properties === void 0 ? void 0 : properties.provisioningState) !== null && _b !== void 0 ? _b : provisioningState;
    return transformStatus({ status, statusCode: rawResponse.statusCode });
}
function toOperationStatus(statusCode) {
    if (statusCode === 202) {
        return "running";
    }
    else if (statusCode < 300) {
        return "succeeded";
    }
    else {
        return "failed";
    }
}
function parseRetryAfter({ rawResponse }) {
    const retryAfter = rawResponse.headers["retry-after"];
    if (retryAfter !== undefined) {
        // Retry-After header value is either in HTTP date format, or in seconds
        const retryAfterInSeconds = parseInt(retryAfter);
        return isNaN(retryAfterInSeconds)
            ? calculatePollingIntervalFromDate(new Date(retryAfter))
            : retryAfterInSeconds * 1000;
    }
    return undefined;
}
function calculatePollingIntervalFromDate(retryAfterDate) {
    const timeNow = Math.floor(new Date().getTime());
    const retryAfterTime = retryAfterDate.getTime();
    if (timeNow < retryAfterTime) {
        return retryAfterTime - timeNow;
    }
    return undefined;
}
function getStatusFromInitialResponse(inputs) {
    const { response, state, operationLocation } = inputs;
    function helper() {
        var _a;
        const mode = (_a = state.config.metadata) === null || _a === void 0 ? void 0 : _a["mode"];
        switch (mode) {
            case undefined:
                return toOperationStatus(response.rawResponse.statusCode);
            case "Body":
                return getOperationStatus(response, state);
            default:
                return "running";
        }
    }
    const status = helper();
    return status === "running" && operationLocation === undefined ? "succeeded" : status;
}
/**
 * Initiates the long-running operation.
 */
async function initHttpOperation(inputs) {
    const { stateProxy, resourceLocationConfig, processResult, lro, setErrorAsResult } = inputs;
    return initOperation({
        init: async () => {
            const response = await lro.sendInitialRequest();
            const config = inferLroMode({
                rawResponse: response.rawResponse,
                requestPath: lro.requestPath,
                requestMethod: lro.requestMethod,
                resourceLocationConfig,
            });
            return Object.assign({ response, operationLocation: config === null || config === void 0 ? void 0 : config.operationLocation, resourceLocation: config === null || config === void 0 ? void 0 : config.resourceLocation }, ((config === null || config === void 0 ? void 0 : config.mode) ? { metadata: { mode: config.mode } } : {}));
        },
        stateProxy,
        processResult: processResult
            ? ({ flatResponse }, state) => processResult(flatResponse, state)
            : ({ flatResponse }) => flatResponse,
        getOperationStatus: getStatusFromInitialResponse,
        setErrorAsResult,
    });
}
function getOperationLocation({ rawResponse }, state) {
    var _a;
    const mode = (_a = state.config.metadata) === null || _a === void 0 ? void 0 : _a["mode"];
    switch (mode) {
        case "OperationLocation": {
            return getOperationLocationPollingUrl({
                operationLocation: getOperationLocationHeader(rawResponse),
                azureAsyncOperation: getAzureAsyncOperationHeader(rawResponse),
            });
        }
        case "ResourceLocation": {
            return getLocationHeader(rawResponse);
        }
        case "Body":
        default: {
            return undefined;
        }
    }
}
function getOperationStatus({ rawResponse }, state) {
    var _a;
    const mode = (_a = state.config.metadata) === null || _a === void 0 ? void 0 : _a["mode"];
    switch (mode) {
        case "OperationLocation": {
            return getStatus(rawResponse);
        }
        case "ResourceLocation": {
            return toOperationStatus(rawResponse.statusCode);
        }
        case "Body": {
            return getProvisioningState(rawResponse);
        }
        default:
            throw new Error(`Internal error: Unexpected operation mode: ${mode}`);
    }
}
function getResourceLocation({ flatResponse }, state) {
    if (typeof flatResponse === "object") {
        const resourceLocation = flatResponse.resourceLocation;
        if (resourceLocation !== undefined) {
            state.config.resourceLocation = resourceLocation;
        }
    }
    return state.config.resourceLocation;
}
/** Polls the long-running operation. */
async function pollHttpOperation(inputs) {
    const { lro, stateProxy, options, processResult, updateState, setDelay, state, setErrorAsResult, } = inputs;
    return pollOperation({
        state,
        stateProxy,
        setDelay,
        processResult: processResult
            ? ({ flatResponse }, inputState) => processResult(flatResponse, inputState)
            : ({ flatResponse }) => flatResponse,
        updateState,
        getPollingInterval: parseRetryAfter,
        getOperationLocation,
        getOperationStatus,
        getResourceLocation,
        options,
        /**
         * The expansion here is intentional because `lro` could be an object that
         * references an inner this, so we need to preserve a reference to it.
         */
        poll: async (location, inputOptions) => lro.sendPollRequest(location, inputOptions),
        setErrorAsResult,
    });
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Map an optional value through a function
 * @internal
 */
const maybemap = (value, f) => value === undefined ? undefined : f(value);
const INTERRUPTED = new Error("The poller is already stopped");
/**
 * A promise that delays resolution until a certain amount of time (in milliseconds) has passed, with facilities for
 * robust cancellation.
 *
 * ### Example:
 *
 * ```javascript
 * let toCancel;
 *
 * // Wait 20 seconds, and optionally allow the function to be cancelled.
 * await delayMs(20000, (cancel) => { toCancel = cancel });
 *
 * // ... if `toCancel` is called before the 20 second timer expires, then the delayMs promise will reject.
 * ```
 *
 * @internal
 * @param ms - the number of milliseconds to wait before resolving
 * @param cb - a callback that can provide the caller with a cancellation function
 */
function delayMs(ms) {
    let aborted = false;
    let toReject;
    return Object.assign(new Promise((resolve, reject) => {
        let token;
        toReject = () => {
            maybemap(token, clearTimeout);
            reject(INTERRUPTED);
        };
        // In the rare case that the operation is _already_ aborted, we will reject instantly. This could happen, for
        // example, if the user calls the cancellation function immediately without yielding execution.
        if (aborted) {
            toReject();
        }
        else {
            token = setTimeout(resolve, ms);
        }
    }), {
        cancel: () => {
            aborted = true;
            toReject === null || toReject === void 0 ? void 0 : toReject();
        },
    });
}

// Copyright (c) Microsoft Corporation.
const createStateProxy$1 = () => ({
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
    const { getOperationLocation, getStatusFromInitialResponse, getStatusFromPollResponse, getResourceLocation, getPollingInterval, resolveOnUnsuccessful, } = inputs;
    return async ({ init, poll }, options) => {
        const { processResult, updateState, withOperationLocation: withOperationLocationCallback, intervalInMs = POLL_INTERVAL_IN_MS, restoreFrom, } = options || {};
        const stateProxy = createStateProxy$1();
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
        const abortController$1 = new abortController.AbortController();
        const handlers = new Map();
        const handleProgressEvents = async () => handlers.forEach((h) => h(state));
        let currentPollIntervalInMs = intervalInMs;
        const poller = {
            getOperationState: () => state,
            getResult: () => state.result,
            isDone: () => ["succeeded", "failed", "canceled"].includes(state.status),
            isStopped: () => resultPromise === undefined,
            stopPolling: () => {
                abortController$1.abort();
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
                    ? new abortController.AbortController([inputAbortSignal, abortController$1.signal])
                    : abortController$1;
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

// Copyright (c) Microsoft Corporation.
/**
 * Creates a poller that can be used to poll a long-running operation.
 * @param lro - Description of the long-running operation
 * @param options - options to configure the poller
 * @returns an initialized poller
 */
async function createHttpPoller(lro, options) {
    const { resourceLocationConfig, intervalInMs, processResult, restoreFrom, updateState, withOperationLocation, resolveOnUnsuccessful = false, } = options || {};
    return buildCreatePoller({
        getStatusFromInitialResponse,
        getStatusFromPollResponse: getOperationStatus,
        getOperationLocation,
        getResourceLocation,
        getPollingInterval: parseRetryAfter,
        resolveOnUnsuccessful,
    })({
        init: async () => {
            const response = await lro.sendInitialRequest();
            const config = inferLroMode({
                rawResponse: response.rawResponse,
                requestPath: lro.requestPath,
                requestMethod: lro.requestMethod,
                resourceLocationConfig,
            });
            return Object.assign({ response, operationLocation: config === null || config === void 0 ? void 0 : config.operationLocation, resourceLocation: config === null || config === void 0 ? void 0 : config.resourceLocation }, ((config === null || config === void 0 ? void 0 : config.mode) ? { metadata: { mode: config.mode } } : {}));
        },
        poll: lro.sendPollRequest,
    }, {
        intervalInMs,
        withOperationLocation,
        restoreFrom,
        updateState,
        processResult: processResult
            ? ({ flatResponse }, state) => processResult(flatResponse, state)
            : ({ flatResponse }) => flatResponse,
    });
}

// Copyright (c) Microsoft Corporation.
const createStateProxy = () => ({
    initState: (config) => ({ config, isStarted: true }),
    setCanceled: (state) => (state.isCancelled = true),
    setError: (state, error) => (state.error = error),
    setResult: (state, result) => (state.result = result),
    setRunning: (state) => (state.isStarted = true),
    setSucceeded: (state) => (state.isCompleted = true),
    setFailed: () => {
        /** empty body */
    },
    getError: (state) => state.error,
    getResult: (state) => state.result,
    isCanceled: (state) => !!state.isCancelled,
    isFailed: (state) => !!state.error,
    isRunning: (state) => !!state.isStarted,
    isSucceeded: (state) => Boolean(state.isCompleted && !state.isCancelled && !state.error),
});
class GenericPollOperation {
    constructor(state, lro, setErrorAsResult, lroResourceLocationConfig, processResult, updateState, isDone) {
        this.state = state;
        this.lro = lro;
        this.setErrorAsResult = setErrorAsResult;
        this.lroResourceLocationConfig = lroResourceLocationConfig;
        this.processResult = processResult;
        this.updateState = updateState;
        this.isDone = isDone;
    }
    setPollerConfig(pollerConfig) {
        this.pollerConfig = pollerConfig;
    }
    async update(options) {
        var _a;
        const stateProxy = createStateProxy();
        if (!this.state.isStarted) {
            this.state = Object.assign(Object.assign({}, this.state), (await initHttpOperation({
                lro: this.lro,
                stateProxy,
                resourceLocationConfig: this.lroResourceLocationConfig,
                processResult: this.processResult,
                setErrorAsResult: this.setErrorAsResult,
            })));
        }
        const updateState = this.updateState;
        const isDone = this.isDone;
        if (!this.state.isCompleted && this.state.error === undefined) {
            await pollHttpOperation({
                lro: this.lro,
                state: this.state,
                stateProxy,
                processResult: this.processResult,
                updateState: updateState
                    ? (state, { rawResponse }) => updateState(state, rawResponse)
                    : undefined,
                isDone: isDone
                    ? ({ flatResponse }, state) => isDone(flatResponse, state)
                    : undefined,
                options,
                setDelay: (intervalInMs) => {
                    this.pollerConfig.intervalInMs = intervalInMs;
                },
                setErrorAsResult: this.setErrorAsResult,
            });
        }
        (_a = options === null || options === void 0 ? void 0 : options.fireProgress) === null || _a === void 0 ? void 0 : _a.call(options, this.state);
        return this;
    }
    async cancel() {
        logger.error("`cancelOperation` is deprecated because it wasn't implemented");
        return this;
    }
    /**
     * Serializes the Poller operation.
     */
    toString() {
        return JSON.stringify({
            state: this.state,
        });
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * When a poller is manually stopped through the `stopPolling` method,
 * the poller will be rejected with an instance of the PollerStoppedError.
 */
class PollerStoppedError extends Error {
    constructor(message) {
        super(message);
        this.name = "PollerStoppedError";
        Object.setPrototypeOf(this, PollerStoppedError.prototype);
    }
}
/**
 * When the operation is cancelled, the poller will be rejected with an instance
 * of the PollerCancelledError.
 */
class PollerCancelledError extends Error {
    constructor(message) {
        super(message);
        this.name = "PollerCancelledError";
        Object.setPrototypeOf(this, PollerCancelledError.prototype);
    }
}
/**
 * A class that represents the definition of a program that polls through consecutive requests
 * until it reaches a state of completion.
 *
 * A poller can be executed manually, by polling request by request by calling to the `poll()` method repeatedly, until its operation is completed.
 * It also provides a way to wait until the operation completes, by calling `pollUntilDone()` and waiting until the operation finishes.
 * Pollers can also request the cancellation of the ongoing process to whom is providing the underlying long running operation.
 *
 * ```ts
 * const poller = new MyPoller();
 *
 * // Polling just once:
 * await poller.poll();
 *
 * // We can try to cancel the request here, by calling:
 * //
 * //     await poller.cancelOperation();
 * //
 *
 * // Getting the final result:
 * const result = await poller.pollUntilDone();
 * ```
 *
 * The Poller is defined by two types, a type representing the state of the poller, which
 * must include a basic set of properties from `PollOperationState<TResult>`,
 * and a return type defined by `TResult`, which can be anything.
 *
 * The Poller class implements the `PollerLike` interface, which allows poller implementations to avoid having
 * to export the Poller's class directly, and instead only export the already instantiated poller with the PollerLike type.
 *
 * ```ts
 * class Client {
 *   public async makePoller: PollerLike<MyOperationState, MyResult> {
 *     const poller = new MyPoller({});
 *     // It might be preferred to return the poller after the first request is made,
 *     // so that some information can be obtained right away.
 *     await poller.poll();
 *     return poller;
 *   }
 * }
 *
 * const poller: PollerLike<MyOperationState, MyResult> = myClient.makePoller();
 * ```
 *
 * A poller can be created through its constructor, then it can be polled until it's completed.
 * At any point in time, the state of the poller can be obtained without delay through the getOperationState method.
 * At any point in time, the intermediate forms of the result type can be requested without delay.
 * Once the underlying operation is marked as completed, the poller will stop and the final value will be returned.
 *
 * ```ts
 * const poller = myClient.makePoller();
 * const state: MyOperationState = poller.getOperationState();
 *
 * // The intermediate result can be obtained at any time.
 * const result: MyResult | undefined = poller.getResult();
 *
 * // The final result can only be obtained after the poller finishes.
 * const result: MyResult = await poller.pollUntilDone();
 * ```
 *
 */
// eslint-disable-next-line no-use-before-define
class Poller {
    /**
     * A poller needs to be initialized by passing in at least the basic properties of the `PollOperation<TState, TResult>`.
     *
     * When writing an implementation of a Poller, this implementation needs to deal with the initialization
     * of any custom state beyond the basic definition of the poller. The basic poller assumes that the poller's
     * operation has already been defined, at least its basic properties. The code below shows how to approach
     * the definition of the constructor of a new custom poller.
     *
     * ```ts
     * export class MyPoller extends Poller<MyOperationState, string> {
     *   constructor({
     *     // Anything you might need outside of the basics
     *   }) {
     *     let state: MyOperationState = {
     *       privateProperty: private,
     *       publicProperty: public,
     *     };
     *
     *     const operation = {
     *       state,
     *       update,
     *       cancel,
     *       toString
     *     }
     *
     *     // Sending the operation to the parent's constructor.
     *     super(operation);
     *
     *     // You can assign more local properties here.
     *   }
     * }
     * ```
     *
     * Inside of this constructor, a new promise is created. This will be used to
     * tell the user when the poller finishes (see `pollUntilDone()`). The promise's
     * resolve and reject methods are also used internally to control when to resolve
     * or reject anyone waiting for the poller to finish.
     *
     * The constructor of a custom implementation of a poller is where any serialized version of
     * a previous poller's operation should be deserialized into the operation sent to the
     * base constructor. For example:
     *
     * ```ts
     * export class MyPoller extends Poller<MyOperationState, string> {
     *   constructor(
     *     baseOperation: string | undefined
     *   ) {
     *     let state: MyOperationState = {};
     *     if (baseOperation) {
     *       state = {
     *         ...JSON.parse(baseOperation).state,
     *         ...state
     *       };
     *     }
     *     const operation = {
     *       state,
     *       // ...
     *     }
     *     super(operation);
     *   }
     * }
     * ```
     *
     * @param operation - Must contain the basic properties of `PollOperation<State, TResult>`.
     */
    constructor(operation) {
        /** controls whether to throw an error if the operation failed or was canceled. */
        this.resolveOnUnsuccessful = false;
        this.stopped = true;
        this.pollProgressCallbacks = [];
        this.operation = operation;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        // This prevents the UnhandledPromiseRejectionWarning in node.js from being thrown.
        // The above warning would get thrown if `poller.poll` is called, it returns an error,
        // and pullUntilDone did not have a .catch or await try/catch on it's return value.
        this.promise.catch(() => {
            /* intentionally blank */
        });
    }
    /**
     * Starts a loop that will break only if the poller is done
     * or if the poller is stopped.
     */
    async startPolling(pollOptions = {}) {
        if (this.stopped) {
            this.stopped = false;
        }
        while (!this.isStopped() && !this.isDone()) {
            await this.poll(pollOptions);
            await this.delay();
        }
    }
    /**
     * pollOnce does one polling, by calling to the update method of the underlying
     * poll operation to make any relevant change effective.
     *
     * It only optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     *
     * @param options - Optional properties passed to the operation's update method.
     */
    async pollOnce(options = {}) {
        if (!this.isDone()) {
            this.operation = await this.operation.update({
                abortSignal: options.abortSignal,
                fireProgress: this.fireProgress.bind(this),
            });
        }
        this.processUpdatedState();
    }
    /**
     * fireProgress calls the functions passed in via onProgress the method of the poller.
     *
     * It loops over all of the callbacks received from onProgress, and executes them, sending them
     * the current operation state.
     *
     * @param state - The current operation state.
     */
    fireProgress(state) {
        for (const callback of this.pollProgressCallbacks) {
            callback(state);
        }
    }
    /**
     * Invokes the underlying operation's cancel method.
     */
    async cancelOnce(options = {}) {
        this.operation = await this.operation.cancel(options);
    }
    /**
     * Returns a promise that will resolve once a single polling request finishes.
     * It does this by calling the update method of the Poller's operation.
     *
     * It only optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     *
     * @param options - Optional properties passed to the operation's update method.
     */
    poll(options = {}) {
        if (!this.pollOncePromise) {
            this.pollOncePromise = this.pollOnce(options);
            const clearPollOncePromise = () => {
                this.pollOncePromise = undefined;
            };
            this.pollOncePromise.then(clearPollOncePromise, clearPollOncePromise).catch(this.reject);
        }
        return this.pollOncePromise;
    }
    processUpdatedState() {
        if (this.operation.state.error) {
            this.stopped = true;
            if (!this.resolveOnUnsuccessful) {
                this.reject(this.operation.state.error);
                throw this.operation.state.error;
            }
        }
        if (this.operation.state.isCancelled) {
            this.stopped = true;
            if (!this.resolveOnUnsuccessful) {
                const error = new PollerCancelledError("Operation was canceled");
                this.reject(error);
                throw error;
            }
        }
        if (this.isDone() && this.resolve) {
            // If the poller has finished polling, this means we now have a result.
            // However, it can be the case that TResult is instantiated to void, so
            // we are not expecting a result anyway. To assert that we might not
            // have a result eventually after finishing polling, we cast the result
            // to TResult.
            this.resolve(this.getResult());
        }
    }
    /**
     * Returns a promise that will resolve once the underlying operation is completed.
     */
    async pollUntilDone(pollOptions = {}) {
        if (this.stopped) {
            this.startPolling(pollOptions).catch(this.reject);
        }
        // This is needed because the state could have been updated by
        // `cancelOperation`, e.g. the operation is canceled or an error occurred.
        this.processUpdatedState();
        return this.promise;
    }
    /**
     * Invokes the provided callback after each polling is completed,
     * sending the current state of the poller's operation.
     *
     * It returns a method that can be used to stop receiving updates on the given callback function.
     */
    onProgress(callback) {
        this.pollProgressCallbacks.push(callback);
        return () => {
            this.pollProgressCallbacks = this.pollProgressCallbacks.filter((c) => c !== callback);
        };
    }
    /**
     * Returns true if the poller has finished polling.
     */
    isDone() {
        const state = this.operation.state;
        return Boolean(state.isCompleted || state.isCancelled || state.error);
    }
    /**
     * Stops the poller from continuing to poll.
     */
    stopPolling() {
        if (!this.stopped) {
            this.stopped = true;
            if (this.reject) {
                this.reject(new PollerStoppedError("This poller is already stopped"));
            }
        }
    }
    /**
     * Returns true if the poller is stopped.
     */
    isStopped() {
        return this.stopped;
    }
    /**
     * Attempts to cancel the underlying operation.
     *
     * It only optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     *
     * If it's called again before it finishes, it will throw an error.
     *
     * @param options - Optional properties passed to the operation's update method.
     */
    cancelOperation(options = {}) {
        if (!this.cancelPromise) {
            this.cancelPromise = this.cancelOnce(options);
        }
        else if (options.abortSignal) {
            throw new Error("A cancel request is currently pending");
        }
        return this.cancelPromise;
    }
    /**
     * Returns the state of the operation.
     *
     * Even though TState will be the same type inside any of the methods of any extension of the Poller class,
     * implementations of the pollers can customize what's shared with the public by writing their own
     * version of the `getOperationState` method, and by defining two types, one representing the internal state of the poller
     * and a public type representing a safe to share subset of the properties of the internal state.
     * Their definition of getOperationState can then return their public type.
     *
     * Example:
     *
     * ```ts
     * // Let's say we have our poller's operation state defined as:
     * interface MyOperationState extends PollOperationState<ResultType> {
     *   privateProperty?: string;
     *   publicProperty?: string;
     * }
     *
     * // To allow us to have a true separation of public and private state, we have to define another interface:
     * interface PublicState extends PollOperationState<ResultType> {
     *   publicProperty?: string;
     * }
     *
     * // Then, we define our Poller as follows:
     * export class MyPoller extends Poller<MyOperationState, ResultType> {
     *   // ... More content is needed here ...
     *
     *   public getOperationState(): PublicState {
     *     const state: PublicState = this.operation.state;
     *     return {
     *       // Properties from PollOperationState<TResult>
     *       isStarted: state.isStarted,
     *       isCompleted: state.isCompleted,
     *       isCancelled: state.isCancelled,
     *       error: state.error,
     *       result: state.result,
     *
     *       // The only other property needed by PublicState.
     *       publicProperty: state.publicProperty
     *     }
     *   }
     * }
     * ```
     *
     * You can see this in the tests of this repository, go to the file:
     * `../test/utils/testPoller.ts`
     * and look for the getOperationState implementation.
     */
    getOperationState() {
        return this.operation.state;
    }
    /**
     * Returns the result value of the operation,
     * regardless of the state of the poller.
     * It can return undefined or an incomplete form of the final TResult value
     * depending on the implementation.
     */
    getResult() {
        const state = this.operation.state;
        return state.result;
    }
    /**
     * Returns a serialized version of the poller's operation
     * by invoking the operation's toString method.
     */
    toString() {
        return this.operation.toString();
    }
}

// Copyright (c) Microsoft Corporation.
/**
 * The LRO Engine, a class that performs polling.
 */
class LroEngine extends Poller {
    constructor(lro, options) {
        const { intervalInMs = POLL_INTERVAL_IN_MS, resumeFrom, resolveOnUnsuccessful = false, isDone, lroResourceLocationConfig, processResult, updateState, } = options || {};
        const state = resumeFrom
            ? deserializeState(resumeFrom)
            : {};
        const operation = new GenericPollOperation(state, lro, !resolveOnUnsuccessful, lroResourceLocationConfig, processResult, updateState, isDone);
        super(operation);
        this.resolveOnUnsuccessful = resolveOnUnsuccessful;
        this.config = { intervalInMs: intervalInMs };
        operation.setPollerConfig(this.config);
    }
    /**
     * The method used by the poller to wait before attempting to update its operation.
     */
    delay() {
        return new Promise((resolve) => setTimeout(() => resolve(), this.config.intervalInMs));
    }
}

exports.LroEngine = LroEngine;
exports.Poller = Poller;
exports.PollerCancelledError = PollerCancelledError;
exports.PollerStoppedError = PollerStoppedError;
exports.createHttpPoller = createHttpPoller;
//# sourceMappingURL=index.js.map
