'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.closeTo =
  exports.arrayNotContaining =
  exports.arrayContaining =
  exports.anything =
  exports.any =
  exports.AsymmetricMatcher =
    void 0;
exports.hasProperty = hasProperty;
exports.stringNotMatching =
  exports.stringNotContaining =
  exports.stringMatching =
  exports.stringContaining =
  exports.objectNotContaining =
  exports.objectContaining =
  exports.notCloseTo =
    void 0;
var _expectUtils = require('@jest/expect-utils');
var matcherUtils = _interopRequireWildcard(require('jest-matcher-utils'));
var _jestUtil = require('jest-util');
var _jestMatchersObject = require('./jestMatchersObject');
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
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const functionToString = Function.prototype.toString;
function fnNameFor(func) {
  if (func.name) {
    return func.name;
  }
  const matches = functionToString
    .call(func)
    .match(/^(?:async)?\s*function\s*\*?\s*([\w$]+)\s*\(/);
  return matches ? matches[1] : '<anonymous>';
}
const utils = Object.freeze({
  ...matcherUtils,
  iterableEquality: _expectUtils.iterableEquality,
  subsetEquality: _expectUtils.subsetEquality
});
function getPrototype(obj) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(obj);
  }
  if (obj.constructor.prototype == obj) {
    return null;
  }
  return obj.constructor.prototype;
}
function hasProperty(obj, property) {
  if (!obj) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(obj, property)) {
    return true;
  }
  return hasProperty(getPrototype(obj), property);
}
class AsymmetricMatcher {
  $$typeof = Symbol.for('jest.asymmetricMatcher');
  constructor(sample, inverse = false) {
    this.sample = sample;
    this.inverse = inverse;
  }
  getMatcherContext() {
    return {
      customTesters: (0, _jestMatchersObject.getCustomEqualityTesters)(),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      dontThrow: () => {},
      ...(0, _jestMatchersObject.getState)(),
      equals: _expectUtils.equals,
      isNot: this.inverse,
      utils
    };
  }
}
exports.AsymmetricMatcher = AsymmetricMatcher;
class Any extends AsymmetricMatcher {
  constructor(sample) {
    if (typeof sample === 'undefined') {
      throw new TypeError(
        'any() expects to be passed a constructor function. ' +
          'Please pass one or use anything() to match any object.'
      );
    }
    super(sample);
  }
  asymmetricMatch(other) {
    if (this.sample == String) {
      return typeof other == 'string' || other instanceof String;
    }
    if (this.sample == Number) {
      return typeof other == 'number' || other instanceof Number;
    }
    if (this.sample == Function) {
      return typeof other == 'function' || other instanceof Function;
    }
    if (this.sample == Boolean) {
      return typeof other == 'boolean' || other instanceof Boolean;
    }
    if (this.sample == BigInt) {
      return typeof other == 'bigint' || other instanceof BigInt;
    }
    if (this.sample == Symbol) {
      return typeof other == 'symbol' || other instanceof Symbol;
    }
    if (this.sample == Object) {
      return typeof other == 'object';
    }
    return other instanceof this.sample;
  }
  toString() {
    return 'Any';
  }
  getExpectedType() {
    if (this.sample == String) {
      return 'string';
    }
    if (this.sample == Number) {
      return 'number';
    }
    if (this.sample == Function) {
      return 'function';
    }
    if (this.sample == Object) {
      return 'object';
    }
    if (this.sample == Boolean) {
      return 'boolean';
    }
    return fnNameFor(this.sample);
  }
  toAsymmetricMatcher() {
    return `Any<${fnNameFor(this.sample)}>`;
  }
}
class Anything extends AsymmetricMatcher {
  asymmetricMatch(other) {
    return other != null;
  }
  toString() {
    return 'Anything';
  }

  // No getExpectedType method, because it matches either null or undefined.

  toAsymmetricMatcher() {
    return 'Anything';
  }
}
class ArrayContaining extends AsymmetricMatcher {
  constructor(sample, inverse = false) {
    super(sample, inverse);
  }
  asymmetricMatch(other) {
    if (!Array.isArray(this.sample)) {
      throw new Error(
        `You must provide an array to ${this.toString()}, not '${typeof this
          .sample}'.`
      );
    }
    const matcherContext = this.getMatcherContext();
    const result =
      this.sample.length === 0 ||
      (Array.isArray(other) &&
        this.sample.every(item =>
          other.some(another =>
            (0, _expectUtils.equals)(
              item,
              another,
              matcherContext.customTesters
            )
          )
        ));
    return this.inverse ? !result : result;
  }
  toString() {
    return `Array${this.inverse ? 'Not' : ''}Containing`;
  }
  getExpectedType() {
    return 'array';
  }
}
class ObjectContaining extends AsymmetricMatcher {
  constructor(sample, inverse = false) {
    super(sample, inverse);
  }
  asymmetricMatch(other) {
    if (typeof this.sample !== 'object') {
      throw new Error(
        `You must provide an object to ${this.toString()}, not '${typeof this
          .sample}'.`
      );
    }
    let result = true;
    const matcherContext = this.getMatcherContext();
    const objectKeys = (0, _expectUtils.getObjectKeys)(this.sample);
    for (const key of objectKeys) {
      if (
        !hasProperty(other, key) ||
        !(0, _expectUtils.equals)(
          this.sample[key],
          other[key],
          matcherContext.customTesters
        )
      ) {
        result = false;
        break;
      }
    }
    return this.inverse ? !result : result;
  }
  toString() {
    return `Object${this.inverse ? 'Not' : ''}Containing`;
  }
  getExpectedType() {
    return 'object';
  }
}
class StringContaining extends AsymmetricMatcher {
  constructor(sample, inverse = false) {
    if (!(0, _expectUtils.isA)('String', sample)) {
      throw new Error('Expected is not a string');
    }
    super(sample, inverse);
  }
  asymmetricMatch(other) {
    const result =
      (0, _expectUtils.isA)('String', other) && other.includes(this.sample);
    return this.inverse ? !result : result;
  }
  toString() {
    return `String${this.inverse ? 'Not' : ''}Containing`;
  }
  getExpectedType() {
    return 'string';
  }
}
class StringMatching extends AsymmetricMatcher {
  constructor(sample, inverse = false) {
    if (
      !(0, _expectUtils.isA)('String', sample) &&
      !(0, _expectUtils.isA)('RegExp', sample)
    ) {
      throw new Error('Expected is not a String or a RegExp');
    }
    super(new RegExp(sample), inverse);
  }
  asymmetricMatch(other) {
    const result =
      (0, _expectUtils.isA)('String', other) && this.sample.test(other);
    return this.inverse ? !result : result;
  }
  toString() {
    return `String${this.inverse ? 'Not' : ''}Matching`;
  }
  getExpectedType() {
    return 'string';
  }
}
class CloseTo extends AsymmetricMatcher {
  precision;
  constructor(sample, precision = 2, inverse = false) {
    if (!(0, _expectUtils.isA)('Number', sample)) {
      throw new Error('Expected is not a Number');
    }
    if (!(0, _expectUtils.isA)('Number', precision)) {
      throw new Error('Precision is not a Number');
    }
    super(sample);
    this.inverse = inverse;
    this.precision = precision;
  }
  asymmetricMatch(other) {
    if (!(0, _expectUtils.isA)('Number', other)) {
      return false;
    }
    let result = false;
    if (other === Infinity && this.sample === Infinity) {
      result = true; // Infinity - Infinity is NaN
    } else if (other === -Infinity && this.sample === -Infinity) {
      result = true; // -Infinity - -Infinity is NaN
    } else {
      result =
        Math.abs(this.sample - other) < Math.pow(10, -this.precision) / 2;
    }
    return this.inverse ? !result : result;
  }
  toString() {
    return `Number${this.inverse ? 'Not' : ''}CloseTo`;
  }
  getExpectedType() {
    return 'number';
  }
  toAsymmetricMatcher() {
    return [
      this.toString(),
      this.sample,
      `(${(0, _jestUtil.pluralize)('digit', this.precision)})`
    ].join(' ');
  }
}
const any = expectedObject => new Any(expectedObject);
exports.any = any;
const anything = () => new Anything();
exports.anything = anything;
const arrayContaining = sample => new ArrayContaining(sample);
exports.arrayContaining = arrayContaining;
const arrayNotContaining = sample => new ArrayContaining(sample, true);
exports.arrayNotContaining = arrayNotContaining;
const objectContaining = sample => new ObjectContaining(sample);
exports.objectContaining = objectContaining;
const objectNotContaining = sample => new ObjectContaining(sample, true);
exports.objectNotContaining = objectNotContaining;
const stringContaining = expected => new StringContaining(expected);
exports.stringContaining = stringContaining;
const stringNotContaining = expected => new StringContaining(expected, true);
exports.stringNotContaining = stringNotContaining;
const stringMatching = expected => new StringMatching(expected);
exports.stringMatching = stringMatching;
const stringNotMatching = expected => new StringMatching(expected, true);
exports.stringNotMatching = stringNotMatching;
const closeTo = (expected, precision) => new CloseTo(expected, precision);
exports.closeTo = closeTo;
const notCloseTo = (expected, precision) =>
  new CloseTo(expected, precision, true);
exports.notCloseTo = notCloseTo;
