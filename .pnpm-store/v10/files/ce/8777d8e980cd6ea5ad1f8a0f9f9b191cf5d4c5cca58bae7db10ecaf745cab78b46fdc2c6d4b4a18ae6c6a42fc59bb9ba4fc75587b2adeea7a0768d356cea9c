'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.describe =
  exports.default =
  exports.beforeEach =
  exports.beforeAll =
  exports.afterEach =
  exports.afterAll =
    void 0;
Object.defineProperty(exports, 'getState', {
  enumerable: true,
  get: function () {
    return _state.getState;
  }
});
exports.it = void 0;
Object.defineProperty(exports, 'resetState', {
  enumerable: true,
  get: function () {
    return _state.resetState;
  }
});
Object.defineProperty(exports, 'run', {
  enumerable: true,
  get: function () {
    return _run.default;
  }
});
Object.defineProperty(exports, 'setState', {
  enumerable: true,
  get: function () {
    return _state.setState;
  }
});
exports.test = void 0;
var _jestEach = require('jest-each');
var _jestUtil = require('jest-util');
var _state = require('./state');
var _run = _interopRequireDefault(require('./run'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const describe = (() => {
  const describe = (blockName, blockFn) =>
    _dispatchDescribe(blockFn, blockName, describe);
  const only = (blockName, blockFn) =>
    _dispatchDescribe(blockFn, blockName, only, 'only');
  const skip = (blockName, blockFn) =>
    _dispatchDescribe(blockFn, blockName, skip, 'skip');
  describe.each = (0, _jestEach.bind)(describe, false);
  only.each = (0, _jestEach.bind)(only, false);
  skip.each = (0, _jestEach.bind)(skip, false);
  describe.only = only;
  describe.skip = skip;
  return describe;
})();
exports.describe = describe;
const _dispatchDescribe = (blockFn, blockName, describeFn, mode) => {
  const asyncError = new _jestUtil.ErrorWithStack(undefined, describeFn);
  if (blockFn === undefined) {
    asyncError.message =
      'Missing second argument. It must be a callback function.';
    throw asyncError;
  }
  if (typeof blockFn !== 'function') {
    asyncError.message = `Invalid second argument, ${blockFn}. It must be a callback function.`;
    throw asyncError;
  }
  try {
    blockName = (0, _jestUtil.convertDescriptorToString)(blockName);
  } catch (error) {
    asyncError.message = error.message;
    throw asyncError;
  }
  (0, _state.dispatchSync)({
    asyncError,
    blockName,
    mode,
    name: 'start_describe_definition'
  });
  const describeReturn = blockFn();
  if ((0, _jestUtil.isPromise)(describeReturn)) {
    throw new _jestUtil.ErrorWithStack(
      'Returning a Promise from "describe" is not supported. Tests must be defined synchronously.',
      describeFn
    );
  } else if (describeReturn !== undefined) {
    throw new _jestUtil.ErrorWithStack(
      'A "describe" callback must not return a value.',
      describeFn
    );
  }
  (0, _state.dispatchSync)({
    blockName,
    mode,
    name: 'finish_describe_definition'
  });
};
const _addHook = (fn, hookType, hookFn, timeout) => {
  const asyncError = new _jestUtil.ErrorWithStack(undefined, hookFn);
  if (typeof fn !== 'function') {
    asyncError.message =
      'Invalid first argument. It must be a callback function.';
    throw asyncError;
  }
  (0, _state.dispatchSync)({
    asyncError,
    fn,
    hookType,
    name: 'add_hook',
    timeout
  });
};

// Hooks have to pass themselves to the HOF in order for us to trim stack traces.
const beforeEach = (fn, timeout) =>
  _addHook(fn, 'beforeEach', beforeEach, timeout);
exports.beforeEach = beforeEach;
const beforeAll = (fn, timeout) =>
  _addHook(fn, 'beforeAll', beforeAll, timeout);
exports.beforeAll = beforeAll;
const afterEach = (fn, timeout) =>
  _addHook(fn, 'afterEach', afterEach, timeout);
exports.afterEach = afterEach;
const afterAll = (fn, timeout) => _addHook(fn, 'afterAll', afterAll, timeout);
exports.afterAll = afterAll;
const test = (() => {
  const test = (testName, fn, timeout) =>
    _addTest(testName, undefined, false, fn, test, timeout);
  const skip = (testName, fn, timeout) =>
    _addTest(testName, 'skip', false, fn, skip, timeout);
  const only = (testName, fn, timeout) =>
    _addTest(testName, 'only', false, fn, test.only, timeout);
  const concurrentTest = (testName, fn, timeout) =>
    _addTest(testName, undefined, true, fn, concurrentTest, timeout);
  const concurrentOnly = (testName, fn, timeout) =>
    _addTest(testName, 'only', true, fn, concurrentOnly, timeout);
  const bindFailing = (concurrent, mode) => {
    const failing = (testName, fn, timeout, eachError) =>
      _addTest(
        testName,
        mode,
        concurrent,
        fn,
        failing,
        timeout,
        true,
        eachError
      );
    failing.each = (0, _jestEach.bind)(failing, false, true);
    return failing;
  };
  test.todo = (testName, ...rest) => {
    if (rest.length > 0 || typeof testName !== 'string') {
      throw new _jestUtil.ErrorWithStack(
        'Todo must be called with only a description.',
        test.todo
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return _addTest(testName, 'todo', false, () => {}, test.todo);
  };
  const _addTest = (
    testName,
    mode,
    concurrent,
    fn,
    testFn,
    timeout,
    failing,
    asyncError = new _jestUtil.ErrorWithStack(undefined, testFn)
  ) => {
    try {
      testName = (0, _jestUtil.convertDescriptorToString)(testName);
    } catch (error) {
      asyncError.message = error.message;
      throw asyncError;
    }
    if (fn === undefined) {
      asyncError.message =
        'Missing second argument. It must be a callback function. Perhaps you want to use `test.todo` for a test placeholder.';
      throw asyncError;
    }
    if (typeof fn !== 'function') {
      asyncError.message = `Invalid second argument, ${fn}. It must be a callback function.`;
      throw asyncError;
    }
    return (0, _state.dispatchSync)({
      asyncError,
      concurrent,
      failing: failing === undefined ? false : failing,
      fn,
      mode,
      name: 'add_test',
      testName,
      timeout
    });
  };
  test.each = (0, _jestEach.bind)(test);
  only.each = (0, _jestEach.bind)(only);
  skip.each = (0, _jestEach.bind)(skip);
  concurrentTest.each = (0, _jestEach.bind)(concurrentTest, false);
  concurrentOnly.each = (0, _jestEach.bind)(concurrentOnly, false);
  only.failing = bindFailing(false, 'only');
  skip.failing = bindFailing(false, 'skip');
  test.failing = bindFailing(false);
  test.only = only;
  test.skip = skip;
  test.concurrent = concurrentTest;
  concurrentTest.only = concurrentOnly;
  concurrentTest.skip = skip;
  concurrentTest.failing = bindFailing(true);
  concurrentOnly.failing = bindFailing(true, 'only');
  return test;
})();
exports.test = test;
const it = test;
exports.it = it;
var _default = {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  test
};
exports.default = _default;
