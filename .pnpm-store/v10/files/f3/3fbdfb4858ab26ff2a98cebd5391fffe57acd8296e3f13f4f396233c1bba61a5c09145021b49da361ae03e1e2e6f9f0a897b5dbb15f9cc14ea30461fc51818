import {
  decodeBuffer,
  encodeBuffer
} from "./chunk-6HYIRFX2.mjs";
import {
  FetchResponse,
  IS_PATCHED_MODULE
} from "./chunk-5UK33FSU.mjs";
import {
  INTERNAL_REQUEST_ID_HEADER_NAME,
  Interceptor,
  InterceptorReadyState,
  createRequestId,
  deleteGlobalSymbol,
  getGlobalSymbol
} from "./chunk-QED3Q6Z2.mjs";

// src/BatchInterceptor.ts
var BatchInterceptor = class extends Interceptor {
  constructor(options) {
    BatchInterceptor.symbol = Symbol(options.name);
    super(BatchInterceptor.symbol);
    this.interceptors = options.interceptors;
  }
  setup() {
    const logger = this.logger.extend("setup");
    logger.info("applying all %d interceptors...", this.interceptors.length);
    for (const interceptor of this.interceptors) {
      logger.info('applying "%s" interceptor...', interceptor.constructor.name);
      interceptor.apply();
      logger.info("adding interceptor dispose subscription");
      this.subscriptions.push(() => interceptor.dispose());
    }
  }
  on(event, listener) {
    for (const interceptor of this.interceptors) {
      interceptor.on(event, listener);
    }
    return this;
  }
  once(event, listener) {
    for (const interceptor of this.interceptors) {
      interceptor.once(event, listener);
    }
    return this;
  }
  off(event, listener) {
    for (const interceptor of this.interceptors) {
      interceptor.off(event, listener);
    }
    return this;
  }
  removeAllListeners(event) {
    for (const interceptors of this.interceptors) {
      interceptors.removeAllListeners(event);
    }
    return this;
  }
};

// src/utils/getCleanUrl.ts
function getCleanUrl(url, isAbsolute = true) {
  return [isAbsolute && url.origin, url.pathname].filter(Boolean).join("");
}
export {
  BatchInterceptor,
  FetchResponse,
  INTERNAL_REQUEST_ID_HEADER_NAME,
  IS_PATCHED_MODULE,
  Interceptor,
  InterceptorReadyState,
  createRequestId,
  decodeBuffer,
  deleteGlobalSymbol,
  encodeBuffer,
  getCleanUrl,
  getGlobalSymbol
};
//# sourceMappingURL=index.mjs.map