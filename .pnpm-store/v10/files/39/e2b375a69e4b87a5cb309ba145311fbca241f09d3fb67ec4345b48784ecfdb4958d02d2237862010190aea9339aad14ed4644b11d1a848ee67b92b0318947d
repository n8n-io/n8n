'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = exports.createMatcher = void 0;
var _expectUtils = require('@jest/expect-utils');
var _jestMatcherUtils = require('jest-matcher-utils');
var _jestMessageUtil = require('jest-message-util');
var _print = require('./print');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable local/ban-types-eventually */

const DID_NOT_THROW = 'Received function did not throw';
const getThrown = e => {
  const hasMessage =
    e !== null && e !== undefined && typeof e.message === 'string';
  if (hasMessage && typeof e.name === 'string' && typeof e.stack === 'string') {
    return {
      hasMessage,
      isError: true,
      message: e.message,
      value: e
    };
  }
  return {
    hasMessage,
    isError: false,
    message: hasMessage ? e.message : String(e),
    value: e
  };
};
const createMatcher = (matcherName, fromPromise) =>
  function (received, expected) {
    const options = {
      isNot: this.isNot,
      promise: this.promise
    };
    let thrown = null;
    if (fromPromise && (0, _expectUtils.isError)(received)) {
      thrown = getThrown(received);
    } else {
      if (typeof received !== 'function') {
        if (!fromPromise) {
          const placeholder = expected === undefined ? '' : 'expected';
          throw new Error(
            (0, _jestMatcherUtils.matcherErrorMessage)(
              (0, _jestMatcherUtils.matcherHint)(
                matcherName,
                undefined,
                placeholder,
                options
              ),
              `${(0, _jestMatcherUtils.RECEIVED_COLOR)(
                'received'
              )} value must be a function`,
              (0, _jestMatcherUtils.printWithType)(
                'Received',
                received,
                _jestMatcherUtils.printReceived
              )
            )
          );
        }
      } else {
        try {
          received();
        } catch (e) {
          thrown = getThrown(e);
        }
      }
    }
    if (expected === undefined) {
      return toThrow(matcherName, options, thrown);
    } else if (typeof expected === 'function') {
      return toThrowExpectedClass(matcherName, options, thrown, expected);
    } else if (typeof expected === 'string') {
      return toThrowExpectedString(matcherName, options, thrown, expected);
    } else if (expected !== null && typeof expected.test === 'function') {
      return toThrowExpectedRegExp(matcherName, options, thrown, expected);
    } else if (
      expected !== null &&
      typeof expected.asymmetricMatch === 'function'
    ) {
      return toThrowExpectedAsymmetric(matcherName, options, thrown, expected);
    } else if (expected !== null && typeof expected === 'object') {
      return toThrowExpectedObject(matcherName, options, thrown, expected);
    } else {
      throw new Error(
        (0, _jestMatcherUtils.matcherErrorMessage)(
          (0, _jestMatcherUtils.matcherHint)(
            matcherName,
            undefined,
            undefined,
            options
          ),
          `${(0, _jestMatcherUtils.EXPECTED_COLOR)(
            'expected'
          )} value must be a string or regular expression or class or error`,
          (0, _jestMatcherUtils.printWithType)(
            'Expected',
            expected,
            _jestMatcherUtils.printExpected
          )
        )
      );
    }
  };
exports.createMatcher = createMatcher;
const matchers = {
  toThrow: createMatcher('toThrow'),
  toThrowError: createMatcher('toThrowError')
};
const toThrowExpectedRegExp = (matcherName, options, thrown, expected) => {
  const pass = thrown !== null && expected.test(thrown.message);
  const message = pass
    ? () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        formatExpected('Expected pattern: not ', expected) +
        (thrown !== null && thrown.hasMessage
          ? formatReceived(
              'Received message:     ',
              thrown,
              'message',
              expected
            ) + formatStack(thrown)
          : formatReceived('Received value:       ', thrown, 'value'))
    : () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        formatExpected('Expected pattern: ', expected) +
        (thrown === null
          ? `\n${DID_NOT_THROW}`
          : thrown.hasMessage
          ? formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:   ', thrown, 'value'));
  return {
    message,
    pass
  };
};
const toThrowExpectedAsymmetric = (matcherName, options, thrown, expected) => {
  const pass = thrown !== null && expected.asymmetricMatch(thrown.value);
  const message = pass
    ? () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        formatExpected('Expected asymmetric matcher: not ', expected) +
        '\n' +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Received name:    ', thrown, 'name') +
            formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Thrown value: ', thrown, 'value'))
    : () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        formatExpected('Expected asymmetric matcher: ', expected) +
        '\n' +
        (thrown === null
          ? DID_NOT_THROW
          : thrown.hasMessage
          ? formatReceived('Received name:    ', thrown, 'name') +
            formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Thrown value: ', thrown, 'value'));
  return {
    message,
    pass
  };
};
const toThrowExpectedObject = (matcherName, options, thrown, expected) => {
  const expectedMessageAndCause = createMessageAndCause(expected);
  const thrownMessageAndCause =
    thrown !== null ? createMessageAndCause(thrown.value) : null;
  const pass =
    thrown !== null &&
    thrown.message === expected.message &&
    thrownMessageAndCause === expectedMessageAndCause;
  const message = pass
    ? () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        formatExpected(
          `Expected ${messageAndCause(expected)}: not `,
          expectedMessageAndCause
        ) +
        (thrown !== null && thrown.hasMessage
          ? formatStack(thrown)
          : formatReceived('Received value:       ', thrown, 'value'))
    : () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        (thrown === null
          ? // eslint-disable-next-line prefer-template
            formatExpected(
              `Expected ${messageAndCause(expected)}: `,
              expectedMessageAndCause
            ) +
            '\n' +
            DID_NOT_THROW
          : thrown.hasMessage
          ? // eslint-disable-next-line prefer-template
            (0, _jestMatcherUtils.printDiffOrStringify)(
              expectedMessageAndCause,
              thrownMessageAndCause,
              `Expected ${messageAndCause(expected)}`,
              `Received ${messageAndCause(thrown.value)}`,
              true
            ) +
            '\n' +
            formatStack(thrown)
          : formatExpected(
              `Expected ${messageAndCause(expected)}: `,
              expectedMessageAndCause
            ) + formatReceived('Received value:   ', thrown, 'value'));
  return {
    message,
    pass
  };
};
const toThrowExpectedClass = (matcherName, options, thrown, expected) => {
  const pass = thrown !== null && thrown.value instanceof expected;
  const message = pass
    ? () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        (0, _print.printExpectedConstructorNameNot)(
          'Expected constructor',
          expected
        ) +
        (thrown !== null &&
        thrown.value != null &&
        typeof thrown.value.constructor === 'function' &&
        thrown.value.constructor !== expected
          ? (0, _print.printReceivedConstructorNameNot)(
              'Received constructor',
              thrown.value.constructor,
              expected
            )
          : '') +
        '\n' +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Received message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value: ', thrown, 'value'))
    : () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        (0, _print.printExpectedConstructorName)(
          'Expected constructor',
          expected
        ) +
        (thrown === null
          ? `\n${DID_NOT_THROW}`
          : `${
              thrown.value != null &&
              typeof thrown.value.constructor === 'function'
                ? (0, _print.printReceivedConstructorName)(
                    'Received constructor',
                    thrown.value.constructor
                  )
                : ''
            }\n${
              thrown.hasMessage
                ? formatReceived('Received message: ', thrown, 'message') +
                  formatStack(thrown)
                : formatReceived('Received value: ', thrown, 'value')
            }`);
  return {
    message,
    pass
  };
};
const toThrowExpectedString = (matcherName, options, thrown, expected) => {
  const pass = thrown !== null && thrown.message.includes(expected);
  const message = pass
    ? () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        formatExpected('Expected substring: not ', expected) +
        (thrown !== null && thrown.hasMessage
          ? formatReceived(
              'Received message:       ',
              thrown,
              'message',
              expected
            ) + formatStack(thrown)
          : formatReceived('Received value:         ', thrown, 'value'))
    : () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          undefined,
          options
        ) +
        '\n\n' +
        formatExpected('Expected substring: ', expected) +
        (thrown === null
          ? `\n${DID_NOT_THROW}`
          : thrown.hasMessage
          ? formatReceived('Received message:   ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Received value:     ', thrown, 'value'));
  return {
    message,
    pass
  };
};
const toThrow = (matcherName, options, thrown) => {
  const pass = thrown !== null;
  const message = pass
    ? () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          '',
          options
        ) +
        '\n\n' +
        (thrown !== null && thrown.hasMessage
          ? formatReceived('Error name:    ', thrown, 'name') +
            formatReceived('Error message: ', thrown, 'message') +
            formatStack(thrown)
          : formatReceived('Thrown value: ', thrown, 'value'))
    : () =>
        // eslint-disable-next-line prefer-template
        (0, _jestMatcherUtils.matcherHint)(
          matcherName,
          undefined,
          '',
          options
        ) +
        '\n\n' +
        DID_NOT_THROW;
  return {
    message,
    pass
  };
};
const formatExpected = (label, expected) =>
  `${label + (0, _jestMatcherUtils.printExpected)(expected)}\n`;
const formatReceived = (label, thrown, key, expected) => {
  if (thrown === null) {
    return '';
  }
  if (key === 'message') {
    const message = thrown.message;
    if (typeof expected === 'string') {
      const index = message.indexOf(expected);
      if (index !== -1) {
        return `${
          label +
          (0, _print.printReceivedStringContainExpectedSubstring)(
            message,
            index,
            expected.length
          )
        }\n`;
      }
    } else if (expected instanceof RegExp) {
      return `${
        label +
        (0, _print.printReceivedStringContainExpectedResult)(
          message,
          typeof expected.exec === 'function' ? expected.exec(message) : null
        )
      }\n`;
    }
    return `${label + (0, _jestMatcherUtils.printReceived)(message)}\n`;
  }
  if (key === 'name') {
    return thrown.isError
      ? `${label + (0, _jestMatcherUtils.printReceived)(thrown.value.name)}\n`
      : '';
  }
  if (key === 'value') {
    return thrown.isError
      ? ''
      : `${label + (0, _jestMatcherUtils.printReceived)(thrown.value)}\n`;
  }
  return '';
};
const formatStack = thrown =>
  thrown === null || !thrown.isError
    ? ''
    : (0, _jestMessageUtil.formatStackTrace)(
        (0, _jestMessageUtil.separateMessageFromStack)(thrown.value.stack)
          .stack,
        {
          rootDir: process.cwd(),
          testMatch: []
        },
        {
          noStackTrace: false
        }
      );
function createMessageAndCauseMessage(error) {
  if (error.cause instanceof Error) {
    return `{ message: ${error.message}, cause: ${createMessageAndCauseMessage(
      error.cause
    )}}`;
  }
  return `{ message: ${error.message} }`;
}
function createMessageAndCause(error) {
  if (error.cause instanceof Error) {
    return createMessageAndCauseMessage(error);
  }
  return error.message;
}
function messageAndCause(error) {
  return error.cause === undefined ? 'message' : 'message and cause';
}
var _default = matchers;
exports.default = _default;
