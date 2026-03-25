'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function util() {
  const data = _interopRequireWildcard(require('util'));
  util = function () {
    return data;
  };
  return data;
}
function _exit() {
  const data = _interopRequireDefault(require('exit'));
  _exit = function () {
    return data;
  };
  return data;
}
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var _BaseReporter = _interopRequireDefault(require('./BaseReporter'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const isDarwin = process.platform === 'darwin';
const icon = path().resolve(__dirname, '../assets/jest_logo.png');
class NotifyReporter extends _BaseReporter.default {
  _notifier = loadNotifier();
  _globalConfig;
  _context;
  static filename = __filename;
  constructor(globalConfig, context) {
    super();
    this._globalConfig = globalConfig;
    this._context = context;
  }
  onRunComplete(testContexts, result) {
    const success =
      result.numFailedTests === 0 && result.numRuntimeErrorTestSuites === 0;
    const firstContext = testContexts.values().next();
    const hasteFS =
      firstContext && firstContext.value && firstContext.value.hasteFS;
    let packageName;
    if (hasteFS != null) {
      // assuming root package.json is the first one
      const [filePath] = hasteFS.matchFiles('package.json');
      packageName =
        filePath != null
          ? hasteFS.getModuleName(filePath)
          : this._globalConfig.rootDir;
    } else {
      packageName = this._globalConfig.rootDir;
    }
    packageName = packageName != null ? `${packageName} - ` : '';
    const notifyMode = this._globalConfig.notifyMode;
    const statusChanged =
      this._context.previousSuccess !== success || this._context.firstRun;
    const testsHaveRun = result.numTotalTests !== 0;
    if (
      testsHaveRun &&
      success &&
      (notifyMode === 'always' ||
        notifyMode === 'success' ||
        notifyMode === 'success-change' ||
        (notifyMode === 'change' && statusChanged) ||
        (notifyMode === 'failure-change' && statusChanged))
    ) {
      const title = util().format('%s%d%% Passed', packageName, 100);
      const message = `${isDarwin ? '\u2705 ' : ''}${(0, _jestUtil().pluralize)(
        'test',
        result.numPassedTests
      )} passed`;
      this._notifier.notify({
        hint: 'int:transient:1',
        icon,
        message,
        timeout: false,
        title
      });
    } else if (
      testsHaveRun &&
      !success &&
      (notifyMode === 'always' ||
        notifyMode === 'failure' ||
        notifyMode === 'failure-change' ||
        (notifyMode === 'change' && statusChanged) ||
        (notifyMode === 'success-change' && statusChanged))
    ) {
      const failed = result.numFailedTests / result.numTotalTests;
      const title = util().format(
        '%s%d%% Failed',
        packageName,
        Math.ceil(Number.isNaN(failed) ? 0 : failed * 100)
      );
      const message = util().format(
        `${isDarwin ? '\u26D4\uFE0F ' : ''}%d of %d tests failed`,
        result.numFailedTests,
        result.numTotalTests
      );
      const watchMode = this._globalConfig.watch || this._globalConfig.watchAll;
      const restartAnswer = 'Run again';
      const quitAnswer = 'Exit tests';
      if (!watchMode) {
        this._notifier.notify({
          hint: 'int:transient:1',
          icon,
          message,
          timeout: false,
          title
        });
      } else {
        this._notifier.notify(
          {
            // @ts-expect-error - not all options are supported by all systems (specifically `actions` and `hint`)
            actions: [restartAnswer, quitAnswer],
            closeLabel: 'Close',
            hint: 'int:transient:1',
            icon,
            message,
            timeout: false,
            title
          },
          (err, _, metadata) => {
            if (err || !metadata) {
              return;
            }
            if (metadata.activationValue === quitAnswer) {
              (0, _exit().default)(0);
              return;
            }
            if (
              metadata.activationValue === restartAnswer &&
              this._context.startRun
            ) {
              this._context.startRun(this._globalConfig);
            }
          }
        );
      }
    }
    this._context.previousSuccess = success;
    this._context.firstRun = false;
  }
}
exports.default = NotifyReporter;
function loadNotifier() {
  try {
    return require('node-notifier');
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
    throw Error(
      'notify reporter requires optional peer dependency "node-notifier" but it was not found'
    );
  }
}
