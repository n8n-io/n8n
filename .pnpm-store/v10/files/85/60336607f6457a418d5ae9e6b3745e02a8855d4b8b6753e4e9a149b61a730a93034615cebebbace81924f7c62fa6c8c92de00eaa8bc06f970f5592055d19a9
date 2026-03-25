// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getOperationLocation, getOperationStatus, getResourceLocation, getStatusFromInitialResponse, inferLroMode, parseRetryAfter, } from "./operation";
import { buildCreatePoller } from "../poller/poller";
/**
 * Creates a poller that can be used to poll a long-running operation.
 * @param lro - Description of the long-running operation
 * @param options - options to configure the poller
 * @returns an initialized poller
 */
export async function createHttpPoller(lro, options) {
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
//# sourceMappingURL=poller.js.map