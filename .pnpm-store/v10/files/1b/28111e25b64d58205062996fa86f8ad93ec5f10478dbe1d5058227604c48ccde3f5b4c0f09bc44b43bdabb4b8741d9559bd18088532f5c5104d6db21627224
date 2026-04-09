// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { initOperation, pollOperation } from "../poller/operation.js";
import { logger } from "../logger.js";
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
    var _a;
    const { location, requestMethod, requestPath, resourceLocationConfig } = inputs;
    switch (requestMethod) {
        case "PUT": {
            return requestPath;
        }
        case "DELETE": {
            return undefined;
        }
        case "PATCH": {
            return (_a = getDefault()) !== null && _a !== void 0 ? _a : requestPath;
        }
        default: {
            return getDefault();
        }
    }
    function getDefault() {
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
export function inferLroMode(inputs) {
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
            logger.verbose(`LRO: unrecognized operation status: ${status}`);
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
export function parseRetryAfter({ rawResponse }) {
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
export function getErrorFromResponse(response) {
    const error = accessBodyProperty(response, "error");
    if (!error) {
        logger.warning(`The long-running operation failed but there is no error property in the response's body`);
        return;
    }
    if (!error.code || !error.message) {
        logger.warning(`The long-running operation failed but the error property in the response's body doesn't contain code or message`);
        return;
    }
    return error;
}
function calculatePollingIntervalFromDate(retryAfterDate) {
    const timeNow = Math.floor(new Date().getTime());
    const retryAfterTime = retryAfterDate.getTime();
    if (timeNow < retryAfterTime) {
        return retryAfterTime - timeNow;
    }
    return undefined;
}
export function getStatusFromInitialResponse(inputs) {
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
export async function initHttpOperation(inputs) {
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
export function getOperationLocation({ rawResponse }, state) {
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
export function getOperationStatus({ rawResponse }, state) {
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
function accessBodyProperty({ flatResponse, rawResponse }, prop) {
    var _a, _b;
    return (_a = flatResponse === null || flatResponse === void 0 ? void 0 : flatResponse[prop]) !== null && _a !== void 0 ? _a : (_b = rawResponse.body) === null || _b === void 0 ? void 0 : _b[prop];
}
export function getResourceLocation(res, state) {
    const loc = accessBodyProperty(res, "resourceLocation");
    if (loc && typeof loc === "string") {
        state.config.resourceLocation = loc;
    }
    return state.config.resourceLocation;
}
export function isOperationError(e) {
    return e.name === "RestError";
}
/** Polls the long-running operation. */
export async function pollHttpOperation(inputs) {
    const { lro, stateProxy, options, processResult, updateState, setDelay, state, setErrorAsResult, } = inputs;
    return pollOperation({
        state,
        stateProxy,
        setDelay,
        processResult: processResult
            ? ({ flatResponse }, inputState) => processResult(flatResponse, inputState)
            : ({ flatResponse }) => flatResponse,
        getError: getErrorFromResponse,
        updateState,
        getPollingInterval: parseRetryAfter,
        getOperationLocation,
        getOperationStatus,
        isOperationError,
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
//# sourceMappingURL=operation.js.map