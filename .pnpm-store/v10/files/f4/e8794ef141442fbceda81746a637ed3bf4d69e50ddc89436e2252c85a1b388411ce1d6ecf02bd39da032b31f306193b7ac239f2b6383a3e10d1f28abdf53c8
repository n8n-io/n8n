// src/middleware/global-error-handler.ts
import { configs } from "../index.mjs";
var handler = null;
var setErrorHandler = (errorHandler) => {
  handler = errorHandler;
};
var GlobalErrorHandlerMiddleware = () => ({
  response(next) {
    if (!configs.Promise) {
      return next();
    }
    return new configs.Promise((resolve, reject) => {
      next().then((response) => resolve(response)).catch((response) => {
        let proceed = true;
        handler && (proceed = !(handler(response) === true));
        proceed && reject(response);
      });
    });
  }
});
var global_error_handler_default = GlobalErrorHandlerMiddleware;
export {
  GlobalErrorHandlerMiddleware,
  global_error_handler_default as default,
  setErrorHandler
};
//# sourceMappingURL=global-error-handler.mjs.map