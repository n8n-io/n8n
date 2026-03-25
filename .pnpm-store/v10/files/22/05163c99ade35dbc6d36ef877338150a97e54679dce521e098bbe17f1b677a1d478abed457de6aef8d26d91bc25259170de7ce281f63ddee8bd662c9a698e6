"use strict";Object.defineProperty(exports, "__esModule", {value: true});


var _chunkLK6DILFKjs = require('./chunk-LK6DILFK.js');



var _chunkBC2BLJQNjs = require('./chunk-BC2BLJQN.js');







var _chunkTIPR373Rjs = require('./chunk-TIPR373R.js');

// src/BatchInterceptor.ts
var BatchInterceptor = class extends _chunkTIPR373Rjs.Interceptor {
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













exports.BatchInterceptor = BatchInterceptor; exports.FetchResponse = _chunkBC2BLJQNjs.FetchResponse; exports.INTERNAL_REQUEST_ID_HEADER_NAME = _chunkTIPR373Rjs.INTERNAL_REQUEST_ID_HEADER_NAME; exports.IS_PATCHED_MODULE = _chunkBC2BLJQNjs.IS_PATCHED_MODULE; exports.Interceptor = _chunkTIPR373Rjs.Interceptor; exports.InterceptorReadyState = _chunkTIPR373Rjs.InterceptorReadyState; exports.createRequestId = _chunkTIPR373Rjs.createRequestId; exports.decodeBuffer = _chunkLK6DILFKjs.decodeBuffer; exports.deleteGlobalSymbol = _chunkTIPR373Rjs.deleteGlobalSymbol; exports.encodeBuffer = _chunkLK6DILFKjs.encodeBuffer; exports.getCleanUrl = getCleanUrl; exports.getGlobalSymbol = _chunkTIPR373Rjs.getGlobalSymbol;
//# sourceMappingURL=index.js.map