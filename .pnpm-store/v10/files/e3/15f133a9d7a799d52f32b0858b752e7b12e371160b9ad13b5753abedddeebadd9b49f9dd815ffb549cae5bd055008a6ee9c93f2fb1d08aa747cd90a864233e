'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = handleDeprecationWarnings;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _jestWatcher() {
  const data = require('jest-watcher');
  _jestWatcher = function () {
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

function handleDeprecationWarnings(pipe, stdin = process.stdin) {
  return new Promise((resolve, reject) => {
    if (typeof stdin.setRawMode === 'function') {
      const messages = [
        _chalk().default.red('There are deprecation warnings.\n'),
        `${_chalk().default.dim(' \u203A Press ')}Enter${_chalk().default.dim(
          ' to continue.'
        )}`,
        `${_chalk().default.dim(' \u203A Press ')}Esc${_chalk().default.dim(
          ' to exit.'
        )}`
      ];
      pipe.write(messages.join('\n'));
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      // this is a string since we set encoding above
      stdin.on('data', key => {
        if (key === _jestWatcher().KEYS.ENTER) {
          resolve();
        } else if (
          [
            _jestWatcher().KEYS.ESCAPE,
            _jestWatcher().KEYS.CONTROL_C,
            _jestWatcher().KEYS.CONTROL_D
          ].indexOf(key) !== -1
        ) {
          reject();
        }
      });
    } else {
      resolve();
    }
  });
}
