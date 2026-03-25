'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = messageParent;
function _worker_threads() {
  const data = require('worker_threads');
  _worker_threads = function () {
    return data;
  };
  return data;
}
var _types = require('../types');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function messageParent(message, parentProcess = process) {
  if (!_worker_threads().isMainThread && _worker_threads().parentPort != null) {
    _worker_threads().parentPort.postMessage([
      _types.PARENT_MESSAGE_CUSTOM,
      message
    ]);
  } else if (typeof parentProcess.send === 'function') {
    parentProcess.send([_types.PARENT_MESSAGE_CUSTOM, message]);
  } else {
    throw new Error('"messageParent" can only be used inside a worker');
  }
}
