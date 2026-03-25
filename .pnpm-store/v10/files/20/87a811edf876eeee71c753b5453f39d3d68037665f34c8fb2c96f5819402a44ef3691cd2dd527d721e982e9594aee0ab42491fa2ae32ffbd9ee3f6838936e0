'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.restoreGlobalErrorHandlers = exports.injectGlobalErrorHandlers = void 0;
var _state = require('./state');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const uncaught = error => {
  (0, _state.dispatchSync)({
    error,
    name: 'error'
  });
};
const injectGlobalErrorHandlers = parentProcess => {
  const uncaughtException = process.listeners('uncaughtException').slice();
  const unhandledRejection = process.listeners('unhandledRejection').slice();
  parentProcess.removeAllListeners('uncaughtException');
  parentProcess.removeAllListeners('unhandledRejection');
  parentProcess.on('uncaughtException', uncaught);
  parentProcess.on('unhandledRejection', uncaught);
  return {
    uncaughtException,
    unhandledRejection
  };
};
exports.injectGlobalErrorHandlers = injectGlobalErrorHandlers;
const restoreGlobalErrorHandlers = (parentProcess, originalErrorHandlers) => {
  parentProcess.removeListener('uncaughtException', uncaught);
  parentProcess.removeListener('unhandledRejection', uncaught);
  for (const listener of originalErrorHandlers.uncaughtException) {
    parentProcess.on('uncaughtException', listener);
  }
  for (const listener of originalErrorHandlers.unhandledRejection) {
    parentProcess.on('unhandledRejection', listener);
  }
};
exports.restoreGlobalErrorHandlers = restoreGlobalErrorHandlers;
