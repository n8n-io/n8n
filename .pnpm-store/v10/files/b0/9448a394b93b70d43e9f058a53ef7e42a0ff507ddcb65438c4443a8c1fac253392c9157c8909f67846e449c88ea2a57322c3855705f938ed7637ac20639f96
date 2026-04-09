'use strict';

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[Circular]";
            }
            seen.add(value);
        }
        return value;
    };
};

const sleep = (seconds) => {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const waiterServiceDefaults = {
    minDelay: 2,
    maxDelay: 120,
};
exports.WaiterState = void 0;
(function (WaiterState) {
    WaiterState["ABORTED"] = "ABORTED";
    WaiterState["FAILURE"] = "FAILURE";
    WaiterState["SUCCESS"] = "SUCCESS";
    WaiterState["RETRY"] = "RETRY";
    WaiterState["TIMEOUT"] = "TIMEOUT";
})(exports.WaiterState || (exports.WaiterState = {}));
const checkExceptions = (result) => {
    if (result.state === exports.WaiterState.ABORTED) {
        const abortError = new Error(`${JSON.stringify({
            ...result,
            reason: "Request was aborted",
        }, getCircularReplacer())}`);
        abortError.name = "AbortError";
        throw abortError;
    }
    else if (result.state === exports.WaiterState.TIMEOUT) {
        const timeoutError = new Error(`${JSON.stringify({
            ...result,
            reason: "Waiter has timed out",
        }, getCircularReplacer())}`);
        timeoutError.name = "TimeoutError";
        throw timeoutError;
    }
    else if (result.state !== exports.WaiterState.SUCCESS) {
        throw new Error(`${JSON.stringify(result, getCircularReplacer())}`);
    }
    return result;
};

const exponentialBackoffWithJitter = (minDelay, maxDelay, attemptCeiling, attempt) => {
    if (attempt > attemptCeiling)
        return maxDelay;
    const delay = minDelay * 2 ** (attempt - 1);
    return randomInRange(minDelay, delay);
};
const randomInRange = (min, max) => min + Math.random() * (max - min);
const runPolling = async ({ minDelay, maxDelay, maxWaitTime, abortController, client, abortSignal }, input, acceptorChecks) => {
    const observedResponses = {};
    const { state, reason } = await acceptorChecks(client, input);
    if (reason) {
        const message = createMessageFromResponse(reason);
        observedResponses[message] |= 0;
        observedResponses[message] += 1;
    }
    if (state !== exports.WaiterState.RETRY) {
        return { state, reason, observedResponses };
    }
    let currentAttempt = 1;
    const waitUntil = Date.now() + maxWaitTime * 1000;
    const attemptCeiling = Math.log(maxDelay / minDelay) / Math.log(2) + 1;
    while (true) {
        if (abortController?.signal?.aborted || abortSignal?.aborted) {
            const message = "AbortController signal aborted.";
            observedResponses[message] |= 0;
            observedResponses[message] += 1;
            return { state: exports.WaiterState.ABORTED, observedResponses };
        }
        const delay = exponentialBackoffWithJitter(minDelay, maxDelay, attemptCeiling, currentAttempt);
        if (Date.now() + delay * 1000 > waitUntil) {
            return { state: exports.WaiterState.TIMEOUT, observedResponses };
        }
        await sleep(delay);
        const { state, reason } = await acceptorChecks(client, input);
        if (reason) {
            const message = createMessageFromResponse(reason);
            observedResponses[message] |= 0;
            observedResponses[message] += 1;
        }
        if (state !== exports.WaiterState.RETRY) {
            return { state, reason, observedResponses };
        }
        currentAttempt += 1;
    }
};
const createMessageFromResponse = (reason) => {
    if (reason?.$responseBodyText) {
        return `Deserialization error for body: ${reason.$responseBodyText}`;
    }
    if (reason?.$metadata?.httpStatusCode) {
        if (reason.$response || reason.message) {
            return `${reason.$response?.statusCode ?? reason.$metadata.httpStatusCode ?? "Unknown"}: ${reason.message}`;
        }
        return `${reason.$metadata.httpStatusCode}: OK`;
    }
    return String(reason?.message ?? JSON.stringify(reason, getCircularReplacer()) ?? "Unknown");
};

const validateWaiterOptions = (options) => {
    if (options.maxWaitTime <= 0) {
        throw new Error(`WaiterConfiguration.maxWaitTime must be greater than 0`);
    }
    else if (options.minDelay <= 0) {
        throw new Error(`WaiterConfiguration.minDelay must be greater than 0`);
    }
    else if (options.maxDelay <= 0) {
        throw new Error(`WaiterConfiguration.maxDelay must be greater than 0`);
    }
    else if (options.maxWaitTime <= options.minDelay) {
        throw new Error(`WaiterConfiguration.maxWaitTime [${options.maxWaitTime}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
    }
    else if (options.maxDelay < options.minDelay) {
        throw new Error(`WaiterConfiguration.maxDelay [${options.maxDelay}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
    }
};

const abortTimeout = (abortSignal) => {
    let onAbort;
    const promise = new Promise((resolve) => {
        onAbort = () => resolve({ state: exports.WaiterState.ABORTED });
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
const createWaiter = async (options, input, acceptorChecks) => {
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

exports.checkExceptions = checkExceptions;
exports.createWaiter = createWaiter;
exports.waiterServiceDefaults = waiterServiceDefaults;
