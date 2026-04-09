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
var retryPolicy_exports = {};
__export(retryPolicy_exports, {
  retryPolicy: () => retryPolicy
});
module.exports = __toCommonJS(retryPolicy_exports);
var import_helpers = require("../util/helpers.js");
var import_AbortError = require("../abort-controller/AbortError.js");
var import_logger = require("../logger/logger.js");
var import_constants = require("../constants.js");
const retryPolicyLogger = (0, import_logger.createClientLogger)("ts-http-runtime retryPolicy");
const retryPolicyName = "retryPolicy";
function retryPolicy(strategies, options = { maxRetries: import_constants.DEFAULT_RETRY_POLICY_COUNT }) {
  const logger = options.logger || retryPolicyLogger;
  return {
    name: retryPolicyName,
    async sendRequest(request, next) {
      let response;
      let responseError;
      let retryCount = -1;
      retryRequest: while (true) {
        retryCount += 1;
        response = void 0;
        responseError = void 0;
        try {
          logger.info(`Retry ${retryCount}: Attempting to send request`, request.requestId);
          response = await next(request);
          logger.info(`Retry ${retryCount}: Received a response from request`, request.requestId);
        } catch (e) {
          logger.error(`Retry ${retryCount}: Received an error from request`, request.requestId);
          responseError = e;
          if (!e || responseError.name !== "RestError") {
            throw e;
          }
          response = responseError.response;
        }
        if (request.abortSignal?.aborted) {
          logger.error(`Retry ${retryCount}: Request aborted.`);
          const abortError = new import_AbortError.AbortError();
          throw abortError;
        }
        if (retryCount >= (options.maxRetries ?? import_constants.DEFAULT_RETRY_POLICY_COUNT)) {
          logger.info(
            `Retry ${retryCount}: Maximum retries reached. Returning the last received response, or throwing the last received error.`
          );
          if (responseError) {
            throw responseError;
          } else if (response) {
            return response;
          } else {
            throw new Error("Maximum retries reached with no response or error to throw");
          }
        }
        logger.info(`Retry ${retryCount}: Processing ${strategies.length} retry strategies.`);
        strategiesLoop: for (const strategy of strategies) {
          const strategyLogger = strategy.logger || logger;
          strategyLogger.info(`Retry ${retryCount}: Processing retry strategy ${strategy.name}.`);
          const modifiers = strategy.retry({
            retryCount,
            response,
            responseError
          });
          if (modifiers.skipStrategy) {
            strategyLogger.info(`Retry ${retryCount}: Skipped.`);
            continue strategiesLoop;
          }
          const { errorToThrow, retryAfterInMs, redirectTo } = modifiers;
          if (errorToThrow) {
            strategyLogger.error(
              `Retry ${retryCount}: Retry strategy ${strategy.name} throws error:`,
              errorToThrow
            );
            throw errorToThrow;
          }
          if (retryAfterInMs || retryAfterInMs === 0) {
            strategyLogger.info(
              `Retry ${retryCount}: Retry strategy ${strategy.name} retries after ${retryAfterInMs}`
            );
            await (0, import_helpers.delay)(retryAfterInMs, void 0, { abortSignal: request.abortSignal });
            continue retryRequest;
          }
          if (redirectTo) {
            strategyLogger.info(
              `Retry ${retryCount}: Retry strategy ${strategy.name} redirects to ${redirectTo}`
            );
            request.url = redirectTo;
            continue retryRequest;
          }
        }
        if (responseError) {
          logger.info(
            `None of the retry strategies could work with the received error. Throwing it.`
          );
          throw responseError;
        }
        if (response) {
          logger.info(
            `None of the retry strategies could work with the received response. Returning it.`
          );
          return response;
        }
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  retryPolicy
});
