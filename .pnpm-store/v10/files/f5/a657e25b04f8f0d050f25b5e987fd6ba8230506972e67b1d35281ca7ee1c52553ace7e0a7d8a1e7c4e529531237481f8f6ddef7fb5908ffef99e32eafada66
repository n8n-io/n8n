'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('./types.js');
var shared = require('@vue/shared');

class ElementPlusError extends Error {
  constructor(m) {
    super(m);
    this.name = "ElementPlusError";
  }
}
function throwError(scope, m) {
  throw new ElementPlusError(`[${scope}] ${m}`);
}
function debugWarn(scope, message) {
  if (process.env.NODE_ENV !== "production") {
    const error = shared.isString(scope) ? new ElementPlusError(`[${scope}] ${message}`) : scope;
    console.warn(error);
  }
}

exports.debugWarn = debugWarn;
exports.throwError = throwError;
//# sourceMappingURL=error.js.map
