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
var _TestPathPatternPrompt = _interopRequireDefault(
  require('../TestPathPatternPrompt')
);
var _activeFiltersMessage = _interopRequireDefault(
  require('../lib/activeFiltersMessage')
);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class TestPathPatternPlugin extends _jestWatcher().BaseWatchPlugin {
  _prompt;
  isInternal;
  constructor(options) {
    super(options);
    this._prompt = new (_jestWatcher().Prompt)();
    this.isInternal = true;
  }
  getUsageInfo() {
    return {
      key: 'p',
      prompt: 'filter by a filename regex pattern'
    };
  }
  onKey(key) {
    this._prompt.put(key);
  }
  run(globalConfig, updateConfigAndRun) {
    return new Promise((res, rej) => {
      const testPathPatternPrompt = new _TestPathPatternPrompt.default(
        this._stdout,
        this._prompt
      );
      testPathPatternPrompt.run(
        value => {
          updateConfigAndRun({
            mode: 'watch',
            testPathPattern: value
          });
          res();
        },
        rej,
        {
          header: (0, _activeFiltersMessage.default)(globalConfig)
        }
      );
    });
  }
}
var _default = TestPathPatternPlugin;
exports.default = _default;
