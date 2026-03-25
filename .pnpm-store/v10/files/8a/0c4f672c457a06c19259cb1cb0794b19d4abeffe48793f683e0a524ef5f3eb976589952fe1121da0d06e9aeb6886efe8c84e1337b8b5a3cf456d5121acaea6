'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
Object.defineProperty(exports, 'AsymmetricMatcher', {
  enumerable: true,
  get: function () {
    return _asymmetricMatchers.AsymmetricMatcher;
  }
});
exports.expect = exports.default = exports.JestAssertionError = void 0;
var _expectUtils = require('@jest/expect-utils');
var matcherUtils = _interopRequireWildcard(require('jest-matcher-utils'));
var _jestUtil = require('jest-util');
var _asymmetricMatchers = require('./asymmetricMatchers');
var _extractExpectedAssertionsErrors = _interopRequireDefault(
  require('./extractExpectedAssertionsErrors')
);
var _jestMatchersObject = require('./jestMatchersObject');
var _matchers = _interopRequireDefault(require('./matchers'));
var _spyMatchers = _interopRequireDefault(require('./spyMatchers'));
var _toThrowMatchers = _interopRequireWildcard(require('./toThrowMatchers'));
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
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var Promise =
  globalThis[Symbol.for('jest-native-promise')] || globalThis.Promise;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* eslint-disable local/prefer-spread-eventually */
class JestAssertionError extends Error {
  matcherResult;
}
exports.JestAssertionError = JestAssertionError;
const createToThrowErrorMatchingSnapshotMatcher = function (matcher) {
  return function (received, testNameOrInlineSnapshot) {
    return matcher.apply(this, [received, testNameOrInlineSnapshot, true]);
  };
};
const getPromiseMatcher = (name, matcher) => {
  if (name === 'toThrow' || name === 'toThrowError') {
    return (0, _toThrowMatchers.createMatcher)(name, true);
  } else if (
    name === 'toThrowErrorMatchingSnapshot' ||
    name === 'toThrowErrorMatchingInlineSnapshot'
  ) {
    return createToThrowErrorMatchingSnapshotMatcher(matcher);
  }
  return null;
};
const expect = (actual, ...rest) => {
  if (rest.length !== 0) {
    throw new Error('Expect takes at most one argument.');
  }
  const allMatchers = (0, _jestMatchersObject.getMatchers)();
  const expectation = {
    not: {},
    rejects: {
      not: {}
    },
    resolves: {
      not: {}
    }
  };
  const err = new JestAssertionError();
  Object.keys(allMatchers).forEach(name => {
    const matcher = allMatchers[name];
    const promiseMatcher = getPromiseMatcher(name, matcher) || matcher;
    expectation[name] = makeThrowingMatcher(matcher, false, '', actual);
    expectation.not[name] = makeThrowingMatcher(matcher, true, '', actual);
    expectation.resolves[name] = makeResolveMatcher(
      name,
      promiseMatcher,
      false,
      actual,
      err
    );
    expectation.resolves.not[name] = makeResolveMatcher(
      name,
      promiseMatcher,
      true,
      actual,
      err
    );
    expectation.rejects[name] = makeRejectMatcher(
      name,
      promiseMatcher,
      false,
      actual,
      err
    );
    expectation.rejects.not[name] = makeRejectMatcher(
      name,
      promiseMatcher,
      true,
      actual,
      err
    );
  });
  return expectation;
};
exports.expect = expect;
const getMessage = message =>
  (message && message()) ||
  matcherUtils.RECEIVED_COLOR('No message was specified for this matcher.');
const makeResolveMatcher =
  (matcherName, matcher, isNot, actual, outerErr) =>
  (...args) => {
    const options = {
      isNot,
      promise: 'resolves'
    };
    if (!(0, _jestUtil.isPromise)(actual)) {
      throw new JestAssertionError(
        matcherUtils.matcherErrorMessage(
          matcherUtils.matcherHint(matcherName, undefined, '', options),
          `${matcherUtils.RECEIVED_COLOR('received')} value must be a promise`,
          matcherUtils.printWithType(
            'Received',
            actual,
            matcherUtils.printReceived
          )
        )
      );
    }
    const innerErr = new JestAssertionError();
    return actual.then(
      result =>
        makeThrowingMatcher(matcher, isNot, 'resolves', result, innerErr).apply(
          null,
          args
        ),
      reason => {
        outerErr.message =
          `${matcherUtils.matcherHint(
            matcherName,
            undefined,
            '',
            options
          )}\n\n` +
          'Received promise rejected instead of resolved\n' +
          `Rejected to value: ${matcherUtils.printReceived(reason)}`;
        return Promise.reject(outerErr);
      }
    );
  };
const makeRejectMatcher =
  (matcherName, matcher, isNot, actual, outerErr) =>
  (...args) => {
    const options = {
      isNot,
      promise: 'rejects'
    };
    const actualWrapper = typeof actual === 'function' ? actual() : actual;
    if (!(0, _jestUtil.isPromise)(actualWrapper)) {
      throw new JestAssertionError(
        matcherUtils.matcherErrorMessage(
          matcherUtils.matcherHint(matcherName, undefined, '', options),
          `${matcherUtils.RECEIVED_COLOR(
            'received'
          )} value must be a promise or a function returning a promise`,
          matcherUtils.printWithType(
            'Received',
            actual,
            matcherUtils.printReceived
          )
        )
      );
    }
    const innerErr = new JestAssertionError();
    return actualWrapper.then(
      result => {
        outerErr.message =
          `${matcherUtils.matcherHint(
            matcherName,
            undefined,
            '',
            options
          )}\n\n` +
          'Received promise resolved instead of rejected\n' +
          `Resolved to value: ${matcherUtils.printReceived(result)}`;
        return Promise.reject(outerErr);
      },
      reason =>
        makeThrowingMatcher(matcher, isNot, 'rejects', reason, innerErr).apply(
          null,
          args
        )
    );
  };
const makeThrowingMatcher = (matcher, isNot, promise, actual, err) =>
  function throwingMatcher(...args) {
    let throws = true;
    const utils = {
      ...matcherUtils,
      iterableEquality: _expectUtils.iterableEquality,
      subsetEquality: _expectUtils.subsetEquality
    };
    const matcherUtilsThing = {
      customTesters: (0, _jestMatchersObject.getCustomEqualityTesters)(),
      // When throws is disabled, the matcher will not throw errors during test
      // execution but instead add them to the global matcher state. If a
      // matcher throws, test execution is normally stopped immediately. The
      // snapshot matcher uses it because we want to log all snapshot
      // failures in a test.
      dontThrow: () => (throws = false),
      equals: _expectUtils.equals,
      utils
    };
    const matcherContext = {
      ...(0, _jestMatchersObject.getState)(),
      ...matcherUtilsThing,
      error: err,
      isNot,
      promise
    };
    const processResult = (result, asyncError) => {
      _validateResult(result);
      (0, _jestMatchersObject.getState)().assertionCalls++;
      if ((result.pass && isNot) || (!result.pass && !isNot)) {
        // XOR
        const message = getMessage(result.message);
        let error;
        if (err) {
          error = err;
          error.message = message;
        } else if (asyncError) {
          error = asyncError;
          error.message = message;
        } else {
          error = new JestAssertionError(message);

          // Try to remove this function from the stack trace frame.
          // Guard for some environments (browsers) that do not support this feature.
          if (Error.captureStackTrace) {
            Error.captureStackTrace(error, throwingMatcher);
          }
        }
        // Passing the result of the matcher with the error so that a custom
        // reporter could access the actual and expected objects of the result
        // for example in order to display a custom visual diff
        error.matcherResult = {
          ...result,
          message
        };
        if (throws) {
          throw error;
        } else {
          (0, _jestMatchersObject.getState)().suppressedErrors.push(error);
        }
      } else {
        (0, _jestMatchersObject.getState)().numPassingAsserts++;
      }
    };
    const handleError = error => {
      if (
        matcher[_jestMatchersObject.INTERNAL_MATCHER_FLAG] === true &&
        !(error instanceof JestAssertionError) &&
        error.name !== 'PrettyFormatPluginError' &&
        // Guard for some environments (browsers) that do not support this feature.
        Error.captureStackTrace
      ) {
        // Try to remove this and deeper functions from the stack trace frame.
        Error.captureStackTrace(error, throwingMatcher);
      }
      throw error;
    };
    let potentialResult;
    try {
      potentialResult =
        matcher[_jestMatchersObject.INTERNAL_MATCHER_FLAG] === true
          ? matcher.call(matcherContext, actual, ...args)
          : // It's a trap specifically for inline snapshot to capture this name
            // in the stack trace, so that it can correctly get the custom matcher
            // function call.
            (function __EXTERNAL_MATCHER_TRAP__() {
              return matcher.call(matcherContext, actual, ...args);
            })();
      if ((0, _jestUtil.isPromise)(potentialResult)) {
        const asyncError = new JestAssertionError();
        if (Error.captureStackTrace) {
          Error.captureStackTrace(asyncError, throwingMatcher);
        }
        return potentialResult
          .then(aResult => processResult(aResult, asyncError))
          .catch(handleError);
      } else {
        return processResult(potentialResult);
      }
    } catch (error) {
      return handleError(error);
    }
  };
expect.extend = matchers =>
  (0, _jestMatchersObject.setMatchers)(matchers, false, expect);
expect.addEqualityTesters = customTesters =>
  (0, _jestMatchersObject.addCustomEqualityTesters)(customTesters);
expect.anything = _asymmetricMatchers.anything;
expect.any = _asymmetricMatchers.any;
expect.not = {
  arrayContaining: _asymmetricMatchers.arrayNotContaining,
  closeTo: _asymmetricMatchers.notCloseTo,
  objectContaining: _asymmetricMatchers.objectNotContaining,
  stringContaining: _asymmetricMatchers.stringNotContaining,
  stringMatching: _asymmetricMatchers.stringNotMatching
};
expect.arrayContaining = _asymmetricMatchers.arrayContaining;
expect.closeTo = _asymmetricMatchers.closeTo;
expect.objectContaining = _asymmetricMatchers.objectContaining;
expect.stringContaining = _asymmetricMatchers.stringContaining;
expect.stringMatching = _asymmetricMatchers.stringMatching;
const _validateResult = result => {
  if (
    typeof result !== 'object' ||
    typeof result.pass !== 'boolean' ||
    (result.message &&
      typeof result.message !== 'string' &&
      typeof result.message !== 'function')
  ) {
    throw new Error(
      'Unexpected return from a matcher function.\n' +
        'Matcher functions should ' +
        'return an object in the following format:\n' +
        '  {message?: string | function, pass: boolean}\n' +
        `'${matcherUtils.stringify(result)}' was returned`
    );
  }
};
function assertions(expected) {
  const error = new Error();
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, assertions);
  }
  (0, _jestMatchersObject.setState)({
    expectedAssertionsNumber: expected,
    expectedAssertionsNumberError: error
  });
}
function hasAssertions(...args) {
  const error = new Error();
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, hasAssertions);
  }
  matcherUtils.ensureNoExpected(args[0], '.hasAssertions');
  (0, _jestMatchersObject.setState)({
    isExpectingAssertions: true,
    isExpectingAssertionsError: error
  });
}

// add default jest matchers
(0, _jestMatchersObject.setMatchers)(_matchers.default, true, expect);
(0, _jestMatchersObject.setMatchers)(_spyMatchers.default, true, expect);
(0, _jestMatchersObject.setMatchers)(_toThrowMatchers.default, true, expect);
expect.assertions = assertions;
expect.hasAssertions = hasAssertions;
expect.getState = _jestMatchersObject.getState;
expect.setState = _jestMatchersObject.setState;
expect.extractExpectedAssertionsErrors =
  _extractExpectedAssertionsErrors.default;
var _default = expect;
exports.default = _default;
