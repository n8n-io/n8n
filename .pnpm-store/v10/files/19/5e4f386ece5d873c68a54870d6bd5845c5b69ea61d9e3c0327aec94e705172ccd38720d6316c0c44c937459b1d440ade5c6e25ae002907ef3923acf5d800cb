var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  WaiterState: () => WaiterState,
  checkExceptions: () => checkExceptions,
  createWaiter: () => createWaiter,
  waiterServiceDefaults: () => waiterServiceDefaults
});
module.exports = __toCommonJS(src_exports);

// src/utils/sleep.ts
var sleep = /* @__PURE__ */ __name((seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
}, "sleep");

// src/waiter.ts
var waiterServiceDefaults = {
  minDelay: 2,
  maxDelay: 120
};
var WaiterState = /* @__PURE__ */ ((WaiterState2) => {
  WaiterState2["ABORTED"] = "ABORTED";
  WaiterState2["FAILURE"] = "FAILURE";
  WaiterState2["SUCCESS"] = "SUCCESS";
  WaiterState2["RETRY"] = "RETRY";
  WaiterState2["TIMEOUT"] = "TIMEOUT";
  return WaiterState2;
})(WaiterState || {});
var checkExceptions = /* @__PURE__ */ __name((result) => {
  if (result.state === "ABORTED" /* ABORTED */) {
    const abortError = new Error(
      `${JSON.stringify({
        ...result,
        reason: "Request was aborted"
      })}`
    );
    abortError.name = "AbortError";
    throw abortError;
  } else if (result.state === "TIMEOUT" /* TIMEOUT */) {
    const timeoutError = new Error(
      `${JSON.stringify({
        ...result,
        reason: "Waiter has timed out"
      })}`
    );
    timeoutError.name = "TimeoutError";
    throw timeoutError;
  } else if (result.state !== "SUCCESS" /* SUCCESS */) {
    throw new Error(`${JSON.stringify(result)}`);
  }
  return result;
}, "checkExceptions");

// src/poller.ts
var exponentialBackoffWithJitter = /* @__PURE__ */ __name((minDelay, maxDelay, attemptCeiling, attempt) => {
  if (attempt > attemptCeiling)
    return maxDelay;
  const delay = minDelay * 2 ** (attempt - 1);
  return randomInRange(minDelay, delay);
}, "exponentialBackoffWithJitter");
var randomInRange = /* @__PURE__ */ __name((min, max) => min + Math.random() * (max - min), "randomInRange");
var runPolling = /* @__PURE__ */ __name(async ({ minDelay, maxDelay, maxWaitTime, abortController, client, abortSignal }, input, acceptorChecks) => {
  const observedResponses = {};
  const { state, reason } = await acceptorChecks(client, input);
  if (reason) {
    const message = createMessageFromResponse(reason);
    observedResponses[message] |= 0;
    observedResponses[message] += 1;
  }
  if (state !== "RETRY" /* RETRY */) {
    return { state, reason, observedResponses };
  }
  let currentAttempt = 1;
  const waitUntil = Date.now() + maxWaitTime * 1e3;
  const attemptCeiling = Math.log(maxDelay / minDelay) / Math.log(2) + 1;
  while (true) {
    if (abortController?.signal?.aborted || abortSignal?.aborted) {
      const message = "AbortController signal aborted.";
      observedResponses[message] |= 0;
      observedResponses[message] += 1;
      return { state: "ABORTED" /* ABORTED */, observedResponses };
    }
    const delay = exponentialBackoffWithJitter(minDelay, maxDelay, attemptCeiling, currentAttempt);
    if (Date.now() + delay * 1e3 > waitUntil) {
      return { state: "TIMEOUT" /* TIMEOUT */, observedResponses };
    }
    await sleep(delay);
    const { state: state2, reason: reason2 } = await acceptorChecks(client, input);
    if (reason2) {
      const message = createMessageFromResponse(reason2);
      observedResponses[message] |= 0;
      observedResponses[message] += 1;
    }
    if (state2 !== "RETRY" /* RETRY */) {
      return { state: state2, reason: reason2, observedResponses };
    }
    currentAttempt += 1;
  }
}, "runPolling");
var createMessageFromResponse = /* @__PURE__ */ __name((reason) => {
  if (reason?.$responseBodyText) {
    return `Deserialization error for body: ${reason.$responseBodyText}`;
  }
  if (reason?.$metadata?.httpStatusCode) {
    if (reason.$response || reason.message) {
      return `${reason.$response.statusCode ?? reason.$metadata.httpStatusCode ?? "Unknown"}: ${reason.message}`;
    }
    return `${reason.$metadata.httpStatusCode}: OK`;
  }
  return String(reason?.message ?? JSON.stringify(reason) ?? "Unknown");
}, "createMessageFromResponse");

// src/utils/validate.ts
var validateWaiterOptions = /* @__PURE__ */ __name((options) => {
  if (options.maxWaitTime <= 0) {
    throw new Error(`WaiterConfiguration.maxWaitTime must be greater than 0`);
  } else if (options.minDelay <= 0) {
    throw new Error(`WaiterConfiguration.minDelay must be greater than 0`);
  } else if (options.maxDelay <= 0) {
    throw new Error(`WaiterConfiguration.maxDelay must be greater than 0`);
  } else if (options.maxWaitTime <= options.minDelay) {
    throw new Error(
      `WaiterConfiguration.maxWaitTime [${options.maxWaitTime}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`
    );
  } else if (options.maxDelay < options.minDelay) {
    throw new Error(
      `WaiterConfiguration.maxDelay [${options.maxDelay}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`
    );
  }
}, "validateWaiterOptions");

// src/createWaiter.ts
var abortTimeout = /* @__PURE__ */ __name(async (abortSignal) => {
  return new Promise((resolve) => {
    const onAbort = /* @__PURE__ */ __name(() => resolve({ state: "ABORTED" /* ABORTED */ }), "onAbort");
    if (typeof abortSignal.addEventListener === "function") {
      abortSignal.addEventListener("abort", onAbort);
    } else {
      abortSignal.onabort = onAbort;
    }
  });
}, "abortTimeout");
var createWaiter = /* @__PURE__ */ __name(async (options, input, acceptorChecks) => {
  const params = {
    ...waiterServiceDefaults,
    ...options
  };
  validateWaiterOptions(params);
  const exitConditions = [runPolling(params, input, acceptorChecks)];
  if (options.abortController) {
    exitConditions.push(abortTimeout(options.abortController.signal));
  }
  if (options.abortSignal) {
    exitConditions.push(abortTimeout(options.abortSignal));
  }
  return Promise.race(exitConditions);
}, "createWaiter");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  createWaiter,
  waiterServiceDefaults,
  WaiterState,
  checkExceptions
});

