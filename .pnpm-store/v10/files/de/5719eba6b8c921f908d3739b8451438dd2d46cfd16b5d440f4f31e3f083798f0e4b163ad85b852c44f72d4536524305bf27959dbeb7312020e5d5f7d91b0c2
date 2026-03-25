export const waiterServiceDefaults = {
    minDelay: 2,
    maxDelay: 120,
};
export var WaiterState;
(function (WaiterState) {
    WaiterState["ABORTED"] = "ABORTED";
    WaiterState["FAILURE"] = "FAILURE";
    WaiterState["SUCCESS"] = "SUCCESS";
    WaiterState["RETRY"] = "RETRY";
    WaiterState["TIMEOUT"] = "TIMEOUT";
})(WaiterState || (WaiterState = {}));
export const checkExceptions = (result) => {
    if (result.state === WaiterState.ABORTED) {
        const abortError = new Error(`${JSON.stringify({
            ...result,
            reason: "Request was aborted",
        })}`);
        abortError.name = "AbortError";
        throw abortError;
    }
    else if (result.state === WaiterState.TIMEOUT) {
        const timeoutError = new Error(`${JSON.stringify({
            ...result,
            reason: "Waiter has timed out",
        })}`);
        timeoutError.name = "TimeoutError";
        throw timeoutError;
    }
    else if (result.state !== WaiterState.SUCCESS) {
        throw new Error(`${JSON.stringify(result)}`);
    }
    return result;
};
