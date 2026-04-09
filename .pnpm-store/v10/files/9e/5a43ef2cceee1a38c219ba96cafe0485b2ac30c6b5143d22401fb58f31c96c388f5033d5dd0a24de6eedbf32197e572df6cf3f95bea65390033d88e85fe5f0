"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollOperation = exports.initOperation = exports.deserializeState = void 0;
const logger_js_1 = require("../logger.js");
const constants_js_1 = require("./constants.js");
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
exports.deserializeState = deserializeState;
function setStateError(inputs) {
    const { state, stateProxy, isOperationError } = inputs;
    return (error) => {
        if (isOperationError(error)) {
            stateProxy.setError(state, error);
            stateProxy.setFailed(state);
        }
        throw error;
    };
}
function appendReadableErrorMessage(currentMessage, innerMessage) {
    let message = currentMessage;
    if (message.slice(-1) !== ".") {
        message = message + ".";
    }
    return message + " " + innerMessage;
}
function simplifyError(err) {
    let message = err.message;
    let code = err.code;
    let curErr = err;
    while (curErr.innererror) {
        curErr = curErr.innererror;
        code = curErr.code;
        message = appendReadableErrorMessage(message, curErr.message);
    }
    return {
        code,
        message,
    };
}
function processOperationStatus(result) {
    const { state, stateProxy, status, isDone, processResult, getError, response, setErrorAsResult } = result;
    switch (status) {
        case "succeeded": {
            stateProxy.setSucceeded(state);
            break;
        }
        case "failed": {
            const err = getError === null || getError === void 0 ? void 0 : getError(response);
            let postfix = "";
            if (err) {
                const { code, message } = simplifyError(err);
                postfix = `. ${code}. ${message}`;
            }
            const errStr = `The long-running operation has failed${postfix}`;
            stateProxy.setError(state, new Error(errStr));
            stateProxy.setFailed(state);
            logger_js_1.logger.warning(errStr);
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
    logger_js_1.logger.verbose(`LRO: Operation description:`, config);
    const state = stateProxy.initState(config);
    const status = getOperationStatus({ response, state, operationLocation });
    processOperationStatus({ state, status, stateProxy, response, setErrorAsResult, processResult });
    return state;
}
exports.initOperation = initOperation;
async function pollOperationHelper(inputs) {
    const { poll, state, stateProxy, operationLocation, getOperationStatus, getResourceLocation, isOperationError, options, } = inputs;
    const response = await poll(operationLocation, options).catch(setStateError({
        state,
        stateProxy,
        isOperationError,
    }));
    const status = getOperationStatus(response, state);
    logger_js_1.logger.verbose(`LRO: Status:\n\tPolling from: ${state.config.operationLocation}\n\tOperation status: ${status}\n\tPolling status: ${constants_js_1.terminalStates.includes(status) ? "Stopped" : "Running"}`);
    if (status === "succeeded") {
        const resourceLocation = getResourceLocation(response, state);
        if (resourceLocation !== undefined) {
            return {
                response: await poll(resourceLocation).catch(setStateError({ state, stateProxy, isOperationError })),
                status,
            };
        }
    }
    return { response, status };
}
/** Polls the long-running operation. */
async function pollOperation(inputs) {
    const { poll, state, stateProxy, options, getOperationStatus, getResourceLocation, getOperationLocation, isOperationError, withOperationLocation, getPollingInterval, processResult, getError, updateState, setDelay, isDone, setErrorAsResult, } = inputs;
    const { operationLocation } = state.config;
    if (operationLocation !== undefined) {
        const { response, status } = await pollOperationHelper({
            poll,
            getOperationStatus,
            state,
            stateProxy,
            operationLocation,
            getResourceLocation,
            isOperationError,
            options,
        });
        processOperationStatus({
            status,
            response,
            state,
            stateProxy,
            isDone,
            processResult,
            getError,
            setErrorAsResult,
        });
        if (!constants_js_1.terminalStates.includes(status)) {
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
exports.pollOperation = pollOperation;
//# sourceMappingURL=operation.js.map