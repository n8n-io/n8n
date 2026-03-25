// src/middleware/log.ts
import { Response } from "../response.mjs";
var defaultSuccessLogger = (message) => {
  const logger = console.info ? console.info : console.log;
  logger(message);
};
var defaultErrorLogger = (message) => {
  const logger = console.error ? console.error : console.log;
  logger(message);
};
var isLoggerEnabled = Boolean(console && console.log);
var successLogger = defaultSuccessLogger;
var errorLogger = defaultErrorLogger;
var setSuccessLogger = (logger) => {
  successLogger = logger;
};
var setErrorLogger = (logger) => {
  errorLogger = logger;
};
var setLoggerEnabled = (value) => {
  isLoggerEnabled = value;
};
var log = (request, response) => {
  if (isLoggerEnabled) {
    const httpCall = `${request.method().toUpperCase()} ${request.url()}`;
    const direction = response ? "<-" : "->";
    const isError = response && !response.success();
    const errorLabel = isError ? "(ERROR) " : "";
    const extra = response ? ` status=${response.status()} '${response.rawData()}'` : "";
    const logger = isError ? errorLogger : successLogger;
    logger(`${direction} ${errorLabel}${httpCall}${extra}`);
  }
  return response || request;
};
var LogMiddleware = () => ({
  async prepareRequest(next) {
    const request = await next();
    log(request);
    return request;
  },
  async response(next) {
    try {
      const response = await next();
      log(response.request(), response);
      return response;
    } catch (err) {
      if (err instanceof Response) {
        log(err.request(), err);
      }
      throw err;
    }
  }
});
var log_default = LogMiddleware;
export {
  LogMiddleware,
  log_default as default,
  defaultErrorLogger,
  defaultSuccessLogger,
  setErrorLogger,
  setLoggerEnabled,
  setSuccessLogger
};
//# sourceMappingURL=log.mjs.map