'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _util() {
  const data = require('util');
  _util = function () {
    return data;
  };
  return data;
}
function _v() {
  const data = require('v8');
  _v = function () {
    return data;
  };
  return data;
}
function _vm() {
  const data = require('vm');
  _vm = function () {
    return data;
  };
  return data;
}
function _jestGetType() {
  const data = require('jest-get-type');
  _jestGetType = function () {
    return data;
  };
  return data;
}
function _prettyFormat() {
  const data = require('pretty-format');
  _prettyFormat = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference lib="es2021.WeakRef" />

const tick = (0, _util().promisify)(setImmediate);
class LeakDetector {
  _isReferenceBeingHeld;
  _finalizationRegistry;
  constructor(value) {
    if ((0, _jestGetType().isPrimitive)(value)) {
      throw new TypeError(
        [
          'Primitives cannot leak memory.',
          `You passed a ${typeof value}: <${(0, _prettyFormat().format)(
            value
          )}>`
        ].join(' ')
      );
    }

    // When `_finalizationRegistry` is GCed the callback we set will no longer be called,
    this._finalizationRegistry = new FinalizationRegistry(() => {
      this._isReferenceBeingHeld = false;
    });
    this._finalizationRegistry.register(value, undefined);
    this._isReferenceBeingHeld = true;

    // Ensure value is not leaked by the closure created by the "weak" callback.
    value = null;
  }
  async isLeaking() {
    this._runGarbageCollector();

    // wait some ticks to allow GC to run properly, see https://github.com/nodejs/node/issues/34636#issuecomment-669366235
    for (let i = 0; i < 10; i++) {
      await tick();
    }
    return this._isReferenceBeingHeld;
  }
  _runGarbageCollector() {
    // @ts-expect-error: not a function on `globalThis`
    const isGarbageCollectorHidden = globalThis.gc == null;

    // GC is usually hidden, so we have to expose it before running.
    (0, _v().setFlagsFromString)('--expose-gc');
    (0, _vm().runInNewContext)('gc')();

    // The GC was not initially exposed, so let's hide it again.
    if (isGarbageCollectorHidden) {
      (0, _v().setFlagsFromString)('--no-expose-gc');
    }
  }
}
exports.default = LeakDetector;
