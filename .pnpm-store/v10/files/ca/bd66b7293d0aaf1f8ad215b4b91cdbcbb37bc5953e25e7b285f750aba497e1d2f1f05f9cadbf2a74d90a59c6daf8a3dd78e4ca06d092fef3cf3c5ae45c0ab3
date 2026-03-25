// src/middleware/timeout.ts
var TimeoutMiddleware = (timeoutValue) => function TimeoutMiddleware2() {
  return {
    async prepareRequest(next) {
      const request = await next();
      const timeout = request.timeout();
      return !timeout ? request.enhance({ timeout: timeoutValue }) : request;
    }
  };
};
var timeout_default = TimeoutMiddleware;
export {
  TimeoutMiddleware,
  timeout_default as default
};
//# sourceMappingURL=timeout.mjs.map