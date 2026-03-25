// src/middleware/retry/v2/index.ts
import { configs } from "../../../index.mjs";
import { assign } from "../../../utils/index.mjs";
import { Response } from "../../../response.mjs";
var defaultRetryConfigs = {
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
  validateRetry: (response) => response.responseStatus >= 500
  // a function that returns true if the request should be retried
};
var RetryMiddleware = (customConfigs = {}) => function RetryMiddleware2() {
  return {
    request(request) {
      this.enableRetry = request.method() === "get";
      this.inboundRequest = request;
      return request;
    },
    response(next) {
      const retryConfigs = assign({}, defaultRetryConfigs, customConfigs);
      const inboundRequest = this.inboundRequest;
      if (!this.enableRetry) {
        return next();
      }
      if (!configs.Promise) {
        return next();
      }
      if (!inboundRequest) {
        return next();
      }
      return new configs.Promise((resolve, reject) => {
        const retryTime = retryConfigs.initialRetryTimeInSecs * 1e3;
        retriableRequest(
          resolve,
          reject,
          next,
          inboundRequest
        )(randomFromRetryTime(retryTime, retryConfigs.factor), 0, retryConfigs);
      });
    }
  };
};
var v2_default = RetryMiddleware;
var retriableRequest = (resolve, reject, next, request) => {
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
          reject(new Response(request, 400, errorMessage, {}, [new Error(errorMessage)]));
        }
      }
    }).catch((response) => {
      if (shouldRetry && retryConfigs.validateRetry(response)) {
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
          reject(new Response(request, 400, errorMessage, {}, [response]));
        }
      }
    });
  };
  return retry;
};
var calculateExponentialRetryTime = (retryTime, retryConfigs) => Math.min(
  randomFromRetryTime(retryTime, retryConfigs.factor) * retryConfigs.multiplier,
  retryConfigs.maxRetryTimeInSecs * 1e3
);
var randomFromRetryTime = (retryTime, factor) => {
  const delta = factor * retryTime;
  return random(retryTime - delta, retryTime + delta);
};
var random = (min, max) => {
  return Math.random() * (max - min) + min;
};
var enhancedResponse = (response, headerRetryCount, retryCount, headerRetryTime, retryTime) => response.enhance({
  headers: {
    [headerRetryCount]: retryCount,
    [headerRetryTime]: retryTime
  }
});
export {
  RetryMiddleware,
  calculateExponentialRetryTime,
  v2_default as default,
  defaultRetryConfigs
};
//# sourceMappingURL=index.mjs.map