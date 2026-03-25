// src/middleware/timeout/index.ts
import { HTTPException } from "../../http-exception.js";
var defaultTimeoutException = new HTTPException(504, {
  message: "Gateway Timeout"
});
var timeout = (duration, exception = defaultTimeoutException) => {
  return async function timeout2(context, next) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(typeof exception === "function" ? exception(context) : exception);
      }, duration);
    });
    try {
      await Promise.race([next(), timeoutPromise]);
    } finally {
      if (timer !== void 0) {
        clearTimeout(timer);
      }
    }
  };
};
export {
  timeout
};
