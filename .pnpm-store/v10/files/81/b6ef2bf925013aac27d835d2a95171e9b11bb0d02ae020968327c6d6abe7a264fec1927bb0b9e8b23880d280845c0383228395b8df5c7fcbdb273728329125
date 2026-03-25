// src/gateway/timeout-error.ts
var isTimeoutError = (e) => {
  return e && e.name === "TimeoutError";
};
var createTimeoutError = (message) => {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
};
export {
  createTimeoutError,
  isTimeoutError
};
//# sourceMappingURL=timeout-error.mjs.map