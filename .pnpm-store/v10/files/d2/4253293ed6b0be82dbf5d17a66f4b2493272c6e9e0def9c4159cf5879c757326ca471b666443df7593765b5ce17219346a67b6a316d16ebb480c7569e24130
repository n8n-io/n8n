import { runPolling } from "./poller";
import { validateWaiterOptions } from "./utils";
import { waiterServiceDefaults, WaiterState } from "./waiter";
const abortTimeout = (abortSignal) => {
    let onAbort;
    const promise = new Promise((resolve) => {
        onAbort = () => resolve({ state: WaiterState.ABORTED });
        if (typeof abortSignal.addEventListener === "function") {
            abortSignal.addEventListener("abort", onAbort);
        }
        else {
            abortSignal.onabort = onAbort;
        }
    });
    return {
        clearListener() {
            if (typeof abortSignal.removeEventListener === "function") {
                abortSignal.removeEventListener("abort", onAbort);
            }
        },
        aborted: promise,
    };
};
export const createWaiter = async (options, input, acceptorChecks) => {
    const params = {
        ...waiterServiceDefaults,
        ...options,
    };
    validateWaiterOptions(params);
    const exitConditions = [runPolling(params, input, acceptorChecks)];
    const finalize = [];
    if (options.abortSignal) {
        const { aborted, clearListener } = abortTimeout(options.abortSignal);
        finalize.push(clearListener);
        exitConditions.push(aborted);
    }
    if (options.abortController?.signal) {
        const { aborted, clearListener } = abortTimeout(options.abortController.signal);
        finalize.push(clearListener);
        exitConditions.push(aborted);
    }
    return Promise.race(exitConditions).then((result) => {
        for (const fn of finalize) {
            fn();
        }
        return result;
    });
};
