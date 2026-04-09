// src/middleware/retry/v1/index.js
import { assign } from "../../../utils/index.mjs";
import RetryMiddlewareV2, { defaultRetryConfigs } from "../v2/index.mjs";
var retryConfigs = assign({}, defaultRetryConfigs);
var setRetryConfigs = (newConfigs) => {
  console.warn("The use of setRetryConfigs is deprecated - use RetryMiddleware v2 instead.");
  retryConfigs = assign({}, retryConfigs, newConfigs);
  middlewareInstance = RetryMiddlewareV2(retryConfigs)();
};
var middlewareInstance = RetryMiddlewareV2(retryConfigs)();
function RetryMiddleware() {
  return {
    response(next, renew, request) {
      return middlewareInstance.response(next, renew, request);
    }
  };
}
var calculateExponentialRetryTime = (retryTime) => Math.min(
  randomFromRetryTime(retryTime) * retryConfigs.multiplier,
  retryConfigs.maxRetryTimeInSecs * 1e3
);
var randomFromRetryTime = (retryTime) => {
  const delta = retryConfigs.factor * retryTime;
  return random(retryTime - delta, retryTime + delta);
};
var random = (min, max) => {
  return Math.random() * (max - min) + min;
};
export {
  calculateExponentialRetryTime,
  RetryMiddleware as default,
  setRetryConfigs
};
//# sourceMappingURL=index.mjs.map