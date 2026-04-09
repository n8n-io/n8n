"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var v2_exports = {};
__export(v2_exports, {
  RetryMiddleware: () => RetryMiddleware,
  calculateExponentialRetryTime: () => calculateExponentialRetryTime,
  default: () => v2_default,
  defaultRetryConfigs: () => defaultRetryConfigs
});
module.exports = __toCommonJS(v2_exports);
var import__ = require("../../../index");
var import_response = require("../../../response");
const defaultRetryConfigs = {
  headerRetryCount: "X-Mappersmith-Retry-Count",
  headerRetryTime: "X-Mappersmith-Retry-Time",
  maxRetryTimeInSecs: 5,
  initialRetryTimeInSecs: 0.1,
  factor: 0.2,
  // randomization factor
  multiplier: 2,
  // exponential factor
  retries: 5,
  // max retries
  validateRetry: (response) => response.responseStatus >= 500,
  // a function that returns true if the request should be retried
  enableRetry: (request) => request.method() === "get"
};
const RetryMiddleware = (customConfigs = {}) => function RetryMiddleware2() {
  const retryConfigs = { ...defaultRetryConfigs, ...customConfigs };
  return {
    response(next, _renew, request) {
      const enableRetry = retryConfigs.enableRetry(request);
      if (!enableRetry) {
        return next();
      }
      if (!import__.configs.Promise) {
        return next();
      }
      if (!request) {
        return next();
      }
      return new import__.configs.Promise((resolve, reject) => {
        const retryTime = retryConfigs.initialRetryTimeInSecs * 1e3;
        retriableRequest(
          resolve,
          reject,
          next,
          request
        )(randomFromRetryTime(retryTime, retryConfigs.factor), 0, retryConfigs);
      });
    }
  };
};
var v2_default = RetryMiddleware;
const retriableRequest = (resolve, reject, next, request) => {
  const retry = (retryTime, retryCount, retryConfigs) => {
    const nextRetryTime = calculateExponentialRetryTime(retryTime, retryConfigs);
    const shouldRetry = retryCount < retryConfigs.retries;
    const scheduleRequest = () => {
      setTimeout(() => retry(nextRetryTime, retryCount + 1, retryConfigs), retryTime);
    };
    next().then((response) => {
      if (shouldRetry && retryConfigs.validateRetry(response)) {
        scheduleRequest();
      } else {
        try {
          resolve(
            enhancedResponse(
              response,
              retryConfigs.headerRetryCount,
              retryCount,
              retryConfigs.headerRetryTime,
              retryTime
            )
          );
        } catch (e) {
          let errorMessage = "";
          if (response instanceof Error) {
            errorMessage = response.message;
          }
          if (typeof e === "object" && e !== null && "message" in e) {
            errorMessage = e.message;
          }
          reject(new import_response.Response(request, 400, errorMessage, {}, [new Error(errorMessage)]));
        }
      }
    }).catch((response) => {
      if (shouldRetry && retryConfigs.validateRetry(response)) {
        scheduleRequest();
      } else if (shouldRetry && isRetriableNetworkError(response.error())) {
        scheduleRequest();
      } else {
        try {
          reject(
            enhancedResponse(
              response,
              retryConfigs.headerRetryCount,
              retryCount,
              retryConfigs.headerRetryTime,
              retryTime
            )
          );
        } catch (e) {
          let errorMessage = "";
          if (response instanceof Error) {
            errorMessage = response.message;
          }
          if (typeof e === "object" && e !== null && "message" in e) {
            errorMessage = e.message;
          }
          reject(new import_response.Response(request, 400, errorMessage, {}, [response]));
        }
      }
    });
  };
  return retry;
};
const calculateExponentialRetryTime = (retryTime, retryConfigs) => Math.min(
  randomFromRetryTime(retryTime, retryConfigs.factor) * retryConfigs.multiplier,
  retryConfigs.maxRetryTimeInSecs * 1e3
);
const randomFromRetryTime = (retryTime, factor) => {
  const delta = factor * retryTime;
  return random(retryTime - delta, retryTime + delta);
};
const random = (min, max) => {
  return Math.random() * (max - min) + min;
};
const enhancedResponse = (response, headerRetryCount, retryCount, headerRetryTime, retryTime) => response.enhance({
  headers: {
    [headerRetryCount]: retryCount,
    [headerRetryTime]: retryTime
  }
});
const RETRIABLE_NETWORK_ERRORS = [
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTDOWN",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT"
];
const isRetriableNetworkError = (err) => err && err.code && RETRIABLE_NETWORK_ERRORS.includes(err.code);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RetryMiddleware,
  calculateExponentialRetryTime,
  defaultRetryConfigs
});
//# sourceMappingURL=index.js.map