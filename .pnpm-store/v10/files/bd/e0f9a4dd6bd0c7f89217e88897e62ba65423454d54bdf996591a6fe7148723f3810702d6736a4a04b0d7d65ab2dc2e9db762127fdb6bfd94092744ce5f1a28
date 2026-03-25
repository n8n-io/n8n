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

class BaseWatchPlugin {
  _stdin;
  _stdout;
  constructor({stdin, stdout}) {
    this._stdin = stdin;
    this._stdout = stdout;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  apply(_hooks) {}
  getUsageInfo(_globalConfig) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onKey(_key) {}
  run(_globalConfig, _updateConfigAndRun) {
    return Promise.resolve();
  }
}
var _default = BaseWatchPlugin;
exports.default = _default;
