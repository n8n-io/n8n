'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _assert = require('assert');
var _chalk = _interopRequireDefault(require('chalk'));
var _jestMatcherUtils = require('jest-matcher-utils');
var _prettyFormat = require('pretty-format');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const assertOperatorsMap = {
  '!=': 'notEqual',
  '!==': 'notStrictEqual',
  '==': 'equal',
  '===': 'strictEqual'
};
const humanReadableOperators = {
  deepEqual: 'to deeply equal',
  deepStrictEqual: 'to deeply and strictly equal',
  equal: 'to be equal',
  notDeepEqual: 'not to deeply equal',
  notDeepStrictEqual: 'not to deeply and strictly equal',
  notEqual: 'to not be equal',
  notStrictEqual: 'not be strictly equal',
  strictEqual: 'to strictly be equal'
};
const formatNodeAssertErrors = (event, state) => {
  if (event.name === 'test_done') {
    event.test.errors = event.test.errors.map(errors => {
      let error;
      if (Array.isArray(errors)) {
        const [originalError, asyncError] = errors;
        if (originalError == null) {
          error = asyncError;
        } else if (!originalError.stack) {
          error = asyncError;
          error.message = originalError.message
            ? originalError.message
            : `thrown: ${(0, _prettyFormat.format)(originalError, {
                maxDepth: 3
              })}`;
        } else {
          error = originalError;
        }
      } else {
        error = errors;
      }
      return isAssertionError(error)
        ? {
            message: assertionErrorMessage(error, {
              expand: state.expand
            })
          }
        : errors;
    });
  }
};
const getOperatorName = (operator, stack) => {
  if (typeof operator === 'string') {
    return assertOperatorsMap[operator] || operator;
  }
  if (stack.match('.doesNotThrow')) {
    return 'doesNotThrow';
  }
  if (stack.match('.throws')) {
    return 'throws';
  }
  return '';
};
const operatorMessage = operator => {
  const niceOperatorName = getOperatorName(operator, '');
  const humanReadableOperator = humanReadableOperators[niceOperatorName];
  return typeof operator === 'string'
    ? `${humanReadableOperator || niceOperatorName} to:\n`
    : '';
};
const assertThrowingMatcherHint = operatorName =>
  operatorName
    ? _chalk.default.dim('assert') +
      _chalk.default.dim(`.${operatorName}(`) +
      _chalk.default.red('function') +
      _chalk.default.dim(')')
    : '';
const assertMatcherHint = (operator, operatorName, expected) => {
  let message = '';
  if (operator === '==' && expected === true) {
    message =
      _chalk.default.dim('assert') +
      _chalk.default.dim('(') +
      _chalk.default.red('received') +
      _chalk.default.dim(')');
  } else if (operatorName) {
    message =
      _chalk.default.dim('assert') +
      _chalk.default.dim(`.${operatorName}(`) +
      _chalk.default.red('received') +
      _chalk.default.dim(', ') +
      _chalk.default.green('expected') +
      _chalk.default.dim(')');
  }
  return message;
};
function assertionErrorMessage(error, options) {
  const {expected, actual, generatedMessage, message, operator, stack} = error;
  const diffString = (0, _jestMatcherUtils.diff)(expected, actual, options);
  const hasCustomMessage = !generatedMessage;
  const operatorName = getOperatorName(operator, stack);
  const trimmedStack = stack
    .replace(message, '')
    .replace(/AssertionError(.*)/g, '');
  if (operatorName === 'doesNotThrow') {
    return (
      // eslint-disable-next-line prefer-template
      buildHintString(assertThrowingMatcherHint(operatorName)) +
      _chalk.default.reset('Expected the function not to throw an error.\n') +
      _chalk.default.reset('Instead, it threw:\n') +
      `  ${(0, _jestMatcherUtils.printReceived)(actual)}` +
      _chalk.default.reset(
        hasCustomMessage ? `\n\nMessage:\n  ${message}` : ''
      ) +
      trimmedStack
    );
  }
  if (operatorName === 'throws') {
    if (error.generatedMessage) {
      return (
        buildHintString(assertThrowingMatcherHint(operatorName)) +
        _chalk.default.reset(error.message) +
        _chalk.default.reset(
          hasCustomMessage ? `\n\nMessage:\n  ${message}` : ''
        ) +
        trimmedStack
      );
    }
    return (
      buildHintString(assertThrowingMatcherHint(operatorName)) +
      _chalk.default.reset('Expected the function to throw an error.\n') +
      _chalk.default.reset("But it didn't throw anything.") +
      _chalk.default.reset(
        hasCustomMessage ? `\n\nMessage:\n  ${message}` : ''
      ) +
      trimmedStack
    );
  }
  if (operatorName === 'fail') {
    return (
      buildHintString(assertMatcherHint(operator, operatorName, expected)) +
      _chalk.default.reset(hasCustomMessage ? `Message:\n  ${message}` : '') +
      trimmedStack
    );
  }
  return (
    // eslint-disable-next-line prefer-template
    buildHintString(assertMatcherHint(operator, operatorName, expected)) +
    _chalk.default.reset(`Expected value ${operatorMessage(operator)}`) +
    `  ${(0, _jestMatcherUtils.printExpected)(expected)}\n` +
    _chalk.default.reset('Received:\n') +
    `  ${(0, _jestMatcherUtils.printReceived)(actual)}` +
    _chalk.default.reset(hasCustomMessage ? `\n\nMessage:\n  ${message}` : '') +
    (diffString ? `\n\nDifference:\n\n${diffString}` : '') +
    trimmedStack
  );
}
function isAssertionError(error) {
  return (
    error &&
    (error instanceof _assert.AssertionError ||
      error.name === _assert.AssertionError.name ||
      error.code === 'ERR_ASSERTION')
  );
}
function buildHintString(hint) {
  return hint ? `${hint}\n\n` : '';
}
var _default = formatNodeAssertErrors;
exports.default = _default;
