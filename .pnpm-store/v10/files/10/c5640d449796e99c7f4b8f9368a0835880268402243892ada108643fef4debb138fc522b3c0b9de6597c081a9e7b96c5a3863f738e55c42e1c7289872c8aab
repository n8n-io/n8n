'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _jestWatcher() {
  const data = require('jest-watcher');
  _jestWatcher = function () {
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

class QuitPlugin extends _jestWatcher().BaseWatchPlugin {
  isInternal;
  constructor(options) {
    super(options);
    this.isInternal = true;
  }
  async run() {
    if (typeof this._stdin.setRawMode === 'function') {
      this._stdin.setRawMode(false);
    }
    this._stdout.write('\n');
    process.exit(0);
  }
  getUsageInfo() {
    return {
      key: 'q',
      prompt: 'quit watch mode'
    };
  }
}
var _default = QuitPlugin;
exports.default = _default;
