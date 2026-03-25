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

class UpdateSnapshotsPlugin extends _jestWatcher().BaseWatchPlugin {
  _hasSnapshotFailure;
  isInternal;
  constructor(options) {
    super(options);
    this.isInternal = true;
    this._hasSnapshotFailure = false;
  }
  run(_globalConfig, updateConfigAndRun) {
    updateConfigAndRun({
      updateSnapshot: 'all'
    });
    return Promise.resolve(false);
  }
  apply(hooks) {
    hooks.onTestRunComplete(results => {
      this._hasSnapshotFailure = results.snapshot.failure;
    });
  }
  getUsageInfo() {
    if (this._hasSnapshotFailure) {
      return {
        key: 'u',
        prompt: 'update failing snapshots'
      };
    }
    return null;
  }
}
var _default = UpdateSnapshotsPlugin;
exports.default = _default;
