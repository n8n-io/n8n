'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getCallsite;
function _traceMapping() {
  const data = require('@jridgewell/trace-mapping');
  _traceMapping = function () {
    return data;
  };
  return data;
}
function _callsites() {
  const data = _interopRequireDefault(require('callsites'));
  _callsites = function () {
    return data;
  };
  return data;
}
function _gracefulFs() {
  const data = require('graceful-fs');
  _gracefulFs = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Copied from https://github.com/rexxars/sourcemap-decorate-callsites/blob/5b9735a156964973a75dc62fd2c7f0c1975458e8/lib/index.js#L113-L158
const addSourceMapConsumer = (callsite, tracer) => {
  const getLineNumber = callsite.getLineNumber.bind(callsite);
  const getColumnNumber = callsite.getColumnNumber.bind(callsite);
  let position = null;
  function getPosition() {
    if (!position) {
      position = (0, _traceMapping().originalPositionFor)(tracer, {
        column: getColumnNumber() ?? -1,
        line: getLineNumber() ?? -1
      });
    }
    return position;
  }
  Object.defineProperties(callsite, {
    getColumnNumber: {
      value() {
        const value = getPosition().column;
        return value == null || value === 0 ? getColumnNumber() : value;
      },
      writable: false
    },
    getLineNumber: {
      value() {
        const value = getPosition().line;
        return value == null || value === 0 ? getLineNumber() : value;
      },
      writable: false
    }
  });
};
function getCallsite(level, sourceMaps) {
  const levelAfterThisCall = level + 1;
  const stack = (0, _callsites().default)()[levelAfterThisCall];
  const sourceMapFileName = sourceMaps?.get(stack.getFileName() ?? '');
  if (sourceMapFileName != null && sourceMapFileName !== '') {
    try {
      const sourceMap = (0, _gracefulFs().readFileSync)(
        sourceMapFileName,
        'utf8'
      );
      addSourceMapConsumer(stack, new (_traceMapping().TraceMap)(sourceMap));
    } catch {
      // ignore
    }
  }
  return stack;
}
