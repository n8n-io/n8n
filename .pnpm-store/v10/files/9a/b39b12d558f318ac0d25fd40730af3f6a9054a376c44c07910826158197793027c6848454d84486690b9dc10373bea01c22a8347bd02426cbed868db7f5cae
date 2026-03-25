'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class ErrorWithStack extends Error {
  constructor(message, callsite, stackLimit) {
    // Ensure we have a large stack length so we get full details.
    const originalStackLimit = Error.stackTraceLimit;
    if (stackLimit) {
      Error.stackTraceLimit = Math.max(stackLimit, originalStackLimit || 10);
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, callsite);
    }
    Error.stackTraceLimit = originalStackLimit;
  }
}
exports.default = ErrorWithStack;
