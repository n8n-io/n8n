'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.setState =
  exports.resetState =
  exports.getState =
  exports.dispatchSync =
  exports.dispatch =
  exports.addEventHandler =
  exports.ROOT_DESCRIBE_BLOCK_NAME =
    void 0;
var _eventHandler = _interopRequireDefault(require('./eventHandler'));
var _formatNodeAssertErrors = _interopRequireDefault(
  require('./formatNodeAssertErrors')
);
var _types = require('./types');
var _utils = require('./utils');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const eventHandlers = [_eventHandler.default, _formatNodeAssertErrors.default];
const ROOT_DESCRIBE_BLOCK_NAME = 'ROOT_DESCRIBE_BLOCK';
exports.ROOT_DESCRIBE_BLOCK_NAME = ROOT_DESCRIBE_BLOCK_NAME;
const createState = () => {
  const ROOT_DESCRIBE_BLOCK = (0, _utils.makeDescribe)(
    ROOT_DESCRIBE_BLOCK_NAME
  );
  return {
    currentDescribeBlock: ROOT_DESCRIBE_BLOCK,
    currentlyRunningTest: null,
    expand: undefined,
    hasFocusedTests: false,
    hasStarted: false,
    includeTestLocationInResult: false,
    maxConcurrency: 5,
    parentProcess: null,
    rootDescribeBlock: ROOT_DESCRIBE_BLOCK,
    seed: 0,
    testNamePattern: null,
    testTimeout: 5000,
    unhandledErrors: []
  };
};

/* eslint-disable no-restricted-globals */
const resetState = () => {
  global[_types.STATE_SYM] = createState();
};
exports.resetState = resetState;
resetState();
const getState = () => global[_types.STATE_SYM];
exports.getState = getState;
const setState = state => (global[_types.STATE_SYM] = state);
/* eslint-enable */
exports.setState = setState;
const dispatch = async event => {
  for (const handler of eventHandlers) {
    await handler(event, getState());
  }
};
exports.dispatch = dispatch;
const dispatchSync = event => {
  for (const handler of eventHandlers) {
    handler(event, getState());
  }
};
exports.dispatchSync = dispatchSync;
const addEventHandler = handler => {
  eventHandlers.push(handler);
};
exports.addEventHandler = addEventHandler;
