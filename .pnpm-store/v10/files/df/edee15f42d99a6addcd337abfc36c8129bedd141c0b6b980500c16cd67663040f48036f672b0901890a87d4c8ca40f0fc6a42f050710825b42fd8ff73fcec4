'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _emittery() {
  const data = _interopRequireDefault(require('emittery'));
  _emittery = function () {
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

class TestWatcher extends _emittery().default {
  state;
  _isWatchMode;
  constructor({isWatchMode}) {
    super();
    this.state = {
      interrupted: false
    };
    this._isWatchMode = isWatchMode;
  }
  async setState(state) {
    Object.assign(this.state, state);
    await this.emit('change', this.state);
  }
  isInterrupted() {
    return this.state.interrupted;
  }
  isWatchMode() {
    return this._isWatchMode;
  }
}
exports.default = TestWatcher;
