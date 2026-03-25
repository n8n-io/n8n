'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.setup = setup;
exports.worker = worker;
function _exit() {
  const data = _interopRequireDefault(require('exit'));
  _exit = function () {
    return data;
  };
  return data;
}
function _jestHasteMap() {
  const data = _interopRequireDefault(require('jest-haste-map'));
  _jestHasteMap = function () {
    return data;
  };
  return data;
}
function _jestMessageUtil() {
  const data = require('jest-message-util');
  _jestMessageUtil = function () {
    return data;
  };
  return data;
}
function _jestRuntime() {
  const data = _interopRequireDefault(require('jest-runtime'));
  _jestRuntime = function () {
    return data;
  };
  return data;
}
function _jestWorker() {
  const data = require('jest-worker');
  _jestWorker = function () {
    return data;
  };
  return data;
}
var _runTest = _interopRequireDefault(require('./runTest'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Make sure uncaught errors are logged before we exit.
process.on('uncaughtException', err => {
  console.error(err.stack);
  (0, _exit().default)(1);
});
const formatError = error => {
  if (typeof error === 'string') {
    const {message, stack} = (0, _jestMessageUtil().separateMessageFromStack)(
      error
    );
    return {
      message,
      stack,
      type: 'Error'
    };
  }
  return {
    code: error.code || undefined,
    message: error.message,
    stack: error.stack,
    type: 'Error'
  };
};
const resolvers = new Map();
const getResolver = config => {
  const resolver = resolvers.get(config.id);
  if (!resolver) {
    throw new Error(`Cannot find resolver for: ${config.id}`);
  }
  return resolver;
};
function setup(setupData) {
  // Module maps that will be needed for the test runs are passed.
  for (const {
    config,
    serializableModuleMap
  } of setupData.serializableResolvers) {
    const moduleMap = _jestHasteMap()
      .default.getStatic(config)
      .getModuleMapFromJSON(serializableModuleMap);
    resolvers.set(
      config.id,
      _jestRuntime().default.createResolver(config, moduleMap)
    );
  }
}
const sendMessageToJest = (eventName, args) => {
  (0, _jestWorker().messageParent)([eventName, args]);
};
async function worker({config, globalConfig, path, context}) {
  try {
    return await (0, _runTest.default)(
      path,
      globalConfig,
      config,
      getResolver(config),
      {
        ...context,
        changedFiles: context.changedFiles && new Set(context.changedFiles),
        sourcesRelatedToTestsInChangedFiles:
          context.sourcesRelatedToTestsInChangedFiles &&
          new Set(context.sourcesRelatedToTestsInChangedFiles)
      },
      sendMessageToJest
    );
  } catch (error) {
    throw formatError(error);
  }
}
