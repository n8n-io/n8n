'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.setState =
  exports.setMatchers =
  exports.getState =
  exports.getMatchers =
  exports.getCustomEqualityTesters =
  exports.addCustomEqualityTesters =
  exports.INTERNAL_MATCHER_FLAG =
    void 0;
var _jestGetType = require('jest-get-type');
var _asymmetricMatchers = require('./asymmetricMatchers');
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
// Global matchers object holds the list of available matchers and
// the state, that can hold matcher specific values that change over time.
const JEST_MATCHERS_OBJECT = Symbol.for('$$jest-matchers-object');

// Notes a built-in/internal Jest matcher.
// Jest may override the stack trace of Errors thrown by internal matchers.
const INTERNAL_MATCHER_FLAG = Symbol.for('$$jest-internal-matcher');
exports.INTERNAL_MATCHER_FLAG = INTERNAL_MATCHER_FLAG;
if (!Object.prototype.hasOwnProperty.call(globalThis, JEST_MATCHERS_OBJECT)) {
  const defaultState = {
    assertionCalls: 0,
    expectedAssertionsNumber: null,
    isExpectingAssertions: false,
    numPassingAsserts: 0,
    suppressedErrors: [] // errors that are not thrown immediately.
  };

  Object.defineProperty(globalThis, JEST_MATCHERS_OBJECT, {
    value: {
      customEqualityTesters: [],
      matchers: Object.create(null),
      state: defaultState
    }
  });
}
const getState = () => globalThis[JEST_MATCHERS_OBJECT].state;
exports.getState = getState;
const setState = state => {
  Object.assign(globalThis[JEST_MATCHERS_OBJECT].state, state);
};
exports.setState = setState;
const getMatchers = () => globalThis[JEST_MATCHERS_OBJECT].matchers;
exports.getMatchers = getMatchers;
const setMatchers = (matchers, isInternal, expect) => {
  Object.keys(matchers).forEach(key => {
    const matcher = matchers[key];
    if (typeof matcher !== 'function') {
      throw new TypeError(
        `expect.extend: \`${key}\` is not a valid matcher. Must be a function, is "${(0,
        _jestGetType.getType)(matcher)}"`
      );
    }
    Object.defineProperty(matcher, INTERNAL_MATCHER_FLAG, {
      value: isInternal
    });
    if (!isInternal) {
      // expect is defined

      class CustomMatcher extends _asymmetricMatchers.AsymmetricMatcher {
        constructor(inverse = false, ...sample) {
          super(sample, inverse);
        }
        asymmetricMatch(other) {
          const {pass} = matcher.call(
            this.getMatcherContext(),
            other,
            ...this.sample
          );
          return this.inverse ? !pass : pass;
        }
        toString() {
          return `${this.inverse ? 'not.' : ''}${key}`;
        }
        getExpectedType() {
          return 'any';
        }
        toAsymmetricMatcher() {
          return `${this.toString()}<${this.sample.map(String).join(', ')}>`;
        }
      }
      Object.defineProperty(expect, key, {
        configurable: true,
        enumerable: true,
        value: (...sample) => new CustomMatcher(false, ...sample),
        writable: true
      });
      Object.defineProperty(expect.not, key, {
        configurable: true,
        enumerable: true,
        value: (...sample) => new CustomMatcher(true, ...sample),
        writable: true
      });
    }
  });
  Object.assign(globalThis[JEST_MATCHERS_OBJECT].matchers, matchers);
};
exports.setMatchers = setMatchers;
const getCustomEqualityTesters = () =>
  globalThis[JEST_MATCHERS_OBJECT].customEqualityTesters;
exports.getCustomEqualityTesters = getCustomEqualityTesters;
const addCustomEqualityTesters = newTesters => {
  if (!Array.isArray(newTesters)) {
    throw new TypeError(
      `expect.customEqualityTesters: Must be set to an array of Testers. Was given "${(0,
      _jestGetType.getType)(newTesters)}"`
    );
  }
  globalThis[JEST_MATCHERS_OBJECT].customEqualityTesters.push(...newTesters);
};
exports.addCustomEqualityTesters = addCustomEqualityTesters;
