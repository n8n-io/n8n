'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.printReceived =
  exports.printExpected =
  exports.printDiffOrStringify =
  exports.pluralize =
  exports.matcherHint =
  exports.matcherErrorMessage =
  exports.highlightTrailingWhitespace =
  exports.getLabelPrinter =
  exports.ensureNumbers =
  exports.ensureNoExpected =
  exports.ensureExpectedIsNumber =
  exports.ensureExpectedIsNonNegativeInteger =
  exports.ensureActualIsNumber =
  exports.diff =
  exports.SUGGEST_TO_CONTAIN_EQUAL =
  exports.RECEIVED_COLOR =
  exports.INVERTED_COLOR =
  exports.EXPECTED_COLOR =
  exports.DIM_COLOR =
  exports.BOLD_WEIGHT =
    void 0;
exports.printWithType = printWithType;
exports.replaceMatchedToAsymmetricMatcher = replaceMatchedToAsymmetricMatcher;
exports.stringify = void 0;
var _chalk = _interopRequireDefault(require('chalk'));
var _jestDiff = require('jest-diff');
var _jestGetType = require('jest-get-type');
var _prettyFormat = require('pretty-format');
var _Replaceable = _interopRequireDefault(require('./Replaceable'));
var _deepCyclicCopyReplaceable = _interopRequireDefault(
  require('./deepCyclicCopyReplaceable')
);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/ban-types-eventually */

const {
  AsymmetricMatcher,
  DOMCollection,
  DOMElement,
  Immutable,
  ReactElement,
  ReactTestComponent
} = _prettyFormat.plugins;
const PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  AsymmetricMatcher
];

// subset of Chalk type

const EXPECTED_COLOR = _chalk.default.green;
exports.EXPECTED_COLOR = EXPECTED_COLOR;
const RECEIVED_COLOR = _chalk.default.red;
exports.RECEIVED_COLOR = RECEIVED_COLOR;
const INVERTED_COLOR = _chalk.default.inverse;
exports.INVERTED_COLOR = INVERTED_COLOR;
const BOLD_WEIGHT = _chalk.default.bold;
exports.BOLD_WEIGHT = BOLD_WEIGHT;
const DIM_COLOR = _chalk.default.dim;
exports.DIM_COLOR = DIM_COLOR;
const MULTILINE_REGEXP = /\n/;
const SPACE_SYMBOL = '\u{00B7}'; // middle dot

const NUMBERS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen'
];
const SUGGEST_TO_CONTAIN_EQUAL = _chalk.default.dim(
  'Looks like you wanted to test for object/array equality with the stricter `toContain` matcher. You probably need to use `toContainEqual` instead.'
);
exports.SUGGEST_TO_CONTAIN_EQUAL = SUGGEST_TO_CONTAIN_EQUAL;
const stringify = (object, maxDepth = 10, maxWidth = 10) => {
  const MAX_LENGTH = 10000;
  let result;
  try {
    result = (0, _prettyFormat.format)(object, {
      maxDepth,
      maxWidth,
      min: true,
      plugins: PLUGINS
    });
  } catch {
    result = (0, _prettyFormat.format)(object, {
      callToJSON: false,
      maxDepth,
      maxWidth,
      min: true,
      plugins: PLUGINS
    });
  }
  if (result.length >= MAX_LENGTH && maxDepth > 1) {
    return stringify(object, Math.floor(maxDepth / 2), maxWidth);
  } else if (result.length >= MAX_LENGTH && maxWidth > 1) {
    return stringify(object, maxDepth, Math.floor(maxWidth / 2));
  } else {
    return result;
  }
};
exports.stringify = stringify;
const highlightTrailingWhitespace = text =>
  text.replace(/\s+$/gm, _chalk.default.inverse('$&'));

// Instead of inverse highlight which now implies a change,
// replace common spaces with middle dot at the end of any line.
exports.highlightTrailingWhitespace = highlightTrailingWhitespace;
const replaceTrailingSpaces = text =>
  text.replace(/\s+$/gm, spaces => SPACE_SYMBOL.repeat(spaces.length));
const printReceived = object =>
  RECEIVED_COLOR(replaceTrailingSpaces(stringify(object)));
exports.printReceived = printReceived;
const printExpected = value =>
  EXPECTED_COLOR(replaceTrailingSpaces(stringify(value)));
exports.printExpected = printExpected;
function printWithType(name, value, print) {
  const type = (0, _jestGetType.getType)(value);
  const hasType =
    type !== 'null' && type !== 'undefined'
      ? `${name} has type:  ${type}\n`
      : '';
  const hasValue = `${name} has value: ${print(value)}`;
  return hasType + hasValue;
}
const ensureNoExpected = (expected, matcherName, options) => {
  if (typeof expected !== 'undefined') {
    // Prepend maybe not only for backward compatibility.
    const matcherString = (options ? '' : '[.not]') + matcherName;
    throw new Error(
      matcherErrorMessage(
        matcherHint(matcherString, undefined, '', options),
        // Because expected is omitted in hint above,
        // expected is black instead of green in message below.
        'this matcher must not have an expected argument',
        printWithType('Expected', expected, printExpected)
      )
    );
  }
};

/**
 * Ensures that `actual` is of type `number | bigint`
 */
exports.ensureNoExpected = ensureNoExpected;
const ensureActualIsNumber = (actual, matcherName, options) => {
  if (typeof actual !== 'number' && typeof actual !== 'bigint') {
    // Prepend maybe not only for backward compatibility.
    const matcherString = (options ? '' : '[.not]') + matcherName;
    throw new Error(
      matcherErrorMessage(
        matcherHint(matcherString, undefined, undefined, options),
        `${RECEIVED_COLOR('received')} value must be a number or bigint`,
        printWithType('Received', actual, printReceived)
      )
    );
  }
};

/**
 * Ensures that `expected` is of type `number | bigint`
 */
exports.ensureActualIsNumber = ensureActualIsNumber;
const ensureExpectedIsNumber = (expected, matcherName, options) => {
  if (typeof expected !== 'number' && typeof expected !== 'bigint') {
    // Prepend maybe not only for backward compatibility.
    const matcherString = (options ? '' : '[.not]') + matcherName;
    throw new Error(
      matcherErrorMessage(
        matcherHint(matcherString, undefined, undefined, options),
        `${EXPECTED_COLOR('expected')} value must be a number or bigint`,
        printWithType('Expected', expected, printExpected)
      )
    );
  }
};

/**
 * Ensures that `actual` & `expected` are of type `number | bigint`
 */
exports.ensureExpectedIsNumber = ensureExpectedIsNumber;
const ensureNumbers = (actual, expected, matcherName, options) => {
  ensureActualIsNumber(actual, matcherName, options);
  ensureExpectedIsNumber(expected, matcherName, options);
};
exports.ensureNumbers = ensureNumbers;
const ensureExpectedIsNonNegativeInteger = (expected, matcherName, options) => {
  if (
    typeof expected !== 'number' ||
    !Number.isSafeInteger(expected) ||
    expected < 0
  ) {
    // Prepend maybe not only for backward compatibility.
    const matcherString = (options ? '' : '[.not]') + matcherName;
    throw new Error(
      matcherErrorMessage(
        matcherHint(matcherString, undefined, undefined, options),
        `${EXPECTED_COLOR('expected')} value must be a non-negative integer`,
        printWithType('Expected', expected, printExpected)
      )
    );
  }
};

// Given array of diffs, return concatenated string:
// * include common substrings
// * exclude change substrings which have opposite op
// * include change substrings which have argument op
//   with inverse highlight only if there is a common substring
exports.ensureExpectedIsNonNegativeInteger = ensureExpectedIsNonNegativeInteger;
const getCommonAndChangedSubstrings = (diffs, op, hasCommonDiff) =>
  diffs.reduce(
    (reduced, diff) =>
      reduced +
      (diff[0] === _jestDiff.DIFF_EQUAL
        ? diff[1]
        : diff[0] !== op
        ? ''
        : hasCommonDiff
        ? INVERTED_COLOR(diff[1])
        : diff[1]),
    ''
  );
const isLineDiffable = (expected, received) => {
  const expectedType = (0, _jestGetType.getType)(expected);
  const receivedType = (0, _jestGetType.getType)(received);
  if (expectedType !== receivedType) {
    return false;
  }
  if ((0, _jestGetType.isPrimitive)(expected)) {
    // Print generic line diff for strings only:
    // * if neither string is empty
    // * if either string has more than one line
    return (
      typeof expected === 'string' &&
      typeof received === 'string' &&
      expected.length !== 0 &&
      received.length !== 0 &&
      (MULTILINE_REGEXP.test(expected) || MULTILINE_REGEXP.test(received))
    );
  }
  if (
    expectedType === 'date' ||
    expectedType === 'function' ||
    expectedType === 'regexp'
  ) {
    return false;
  }
  if (expected instanceof Error && received instanceof Error) {
    return false;
  }
  if (
    receivedType === 'object' &&
    typeof received.asymmetricMatch === 'function'
  ) {
    return false;
  }
  return true;
};
const MAX_DIFF_STRING_LENGTH = 20000;
const printDiffOrStringify = (
  expected,
  received,
  expectedLabel,
  receivedLabel,
  expand // CLI options: true if `--expand` or false if `--no-expand`
) => {
  if (
    typeof expected === 'string' &&
    typeof received === 'string' &&
    expected.length !== 0 &&
    received.length !== 0 &&
    expected.length <= MAX_DIFF_STRING_LENGTH &&
    received.length <= MAX_DIFF_STRING_LENGTH &&
    expected !== received
  ) {
    if (expected.includes('\n') || received.includes('\n')) {
      return (0, _jestDiff.diffStringsUnified)(expected, received, {
        aAnnotation: expectedLabel,
        bAnnotation: receivedLabel,
        changeLineTrailingSpaceColor: _chalk.default.bgYellow,
        commonLineTrailingSpaceColor: _chalk.default.bgYellow,
        emptyFirstOrLastLinePlaceholder: '↵',
        // U+21B5
        expand,
        includeChangeCounts: true
      });
    }
    const diffs = (0, _jestDiff.diffStringsRaw)(expected, received, true);
    const hasCommonDiff = diffs.some(diff => diff[0] === _jestDiff.DIFF_EQUAL);
    const printLabel = getLabelPrinter(expectedLabel, receivedLabel);
    const expectedLine =
      printLabel(expectedLabel) +
      printExpected(
        getCommonAndChangedSubstrings(
          diffs,
          _jestDiff.DIFF_DELETE,
          hasCommonDiff
        )
      );
    const receivedLine =
      printLabel(receivedLabel) +
      printReceived(
        getCommonAndChangedSubstrings(
          diffs,
          _jestDiff.DIFF_INSERT,
          hasCommonDiff
        )
      );
    return `${expectedLine}\n${receivedLine}`;
  }
  if (isLineDiffable(expected, received)) {
    const {replacedExpected, replacedReceived} =
      replaceMatchedToAsymmetricMatcher(expected, received, [], []);
    const difference = (0, _jestDiff.diff)(replacedExpected, replacedReceived, {
      aAnnotation: expectedLabel,
      bAnnotation: receivedLabel,
      expand,
      includeChangeCounts: true
    });
    if (
      typeof difference === 'string' &&
      difference.includes(`- ${expectedLabel}`) &&
      difference.includes(`+ ${receivedLabel}`)
    ) {
      return difference;
    }
  }
  const printLabel = getLabelPrinter(expectedLabel, receivedLabel);
  const expectedLine = printLabel(expectedLabel) + printExpected(expected);
  const receivedLine =
    printLabel(receivedLabel) +
    (stringify(expected) === stringify(received)
      ? 'serializes to the same string'
      : printReceived(received));
  return `${expectedLine}\n${receivedLine}`;
};

// Sometimes, e.g. when comparing two numbers, the output from jest-diff
// does not contain more information than the `Expected:` / `Received:` already gives.
// In those cases, we do not print a diff to make the output shorter and not redundant.
exports.printDiffOrStringify = printDiffOrStringify;
const shouldPrintDiff = (actual, expected) => {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return false;
  }
  if (typeof actual === 'bigint' && typeof expected === 'bigint') {
    return false;
  }
  if (typeof actual === 'boolean' && typeof expected === 'boolean') {
    return false;
  }
  return true;
};
function replaceMatchedToAsymmetricMatcher(
  replacedExpected,
  replacedReceived,
  expectedCycles,
  receivedCycles
) {
  return _replaceMatchedToAsymmetricMatcher(
    (0, _deepCyclicCopyReplaceable.default)(replacedExpected),
    (0, _deepCyclicCopyReplaceable.default)(replacedReceived),
    expectedCycles,
    receivedCycles
  );
}
function _replaceMatchedToAsymmetricMatcher(
  replacedExpected,
  replacedReceived,
  expectedCycles,
  receivedCycles
) {
  if (!_Replaceable.default.isReplaceable(replacedExpected, replacedReceived)) {
    return {
      replacedExpected,
      replacedReceived
    };
  }
  if (
    expectedCycles.includes(replacedExpected) ||
    receivedCycles.includes(replacedReceived)
  ) {
    return {
      replacedExpected,
      replacedReceived
    };
  }
  expectedCycles.push(replacedExpected);
  receivedCycles.push(replacedReceived);
  const expectedReplaceable = new _Replaceable.default(replacedExpected);
  const receivedReplaceable = new _Replaceable.default(replacedReceived);
  expectedReplaceable.forEach((expectedValue, key) => {
    const receivedValue = receivedReplaceable.get(key);
    if (isAsymmetricMatcher(expectedValue)) {
      if (expectedValue.asymmetricMatch(receivedValue)) {
        receivedReplaceable.set(key, expectedValue);
      }
    } else if (isAsymmetricMatcher(receivedValue)) {
      if (receivedValue.asymmetricMatch(expectedValue)) {
        expectedReplaceable.set(key, receivedValue);
      }
    } else if (
      _Replaceable.default.isReplaceable(expectedValue, receivedValue)
    ) {
      const replaced = _replaceMatchedToAsymmetricMatcher(
        expectedValue,
        receivedValue,
        expectedCycles,
        receivedCycles
      );
      expectedReplaceable.set(key, replaced.replacedExpected);
      receivedReplaceable.set(key, replaced.replacedReceived);
    }
  });
  return {
    replacedExpected: expectedReplaceable.object,
    replacedReceived: receivedReplaceable.object
  };
}
function isAsymmetricMatcher(data) {
  const type = (0, _jestGetType.getType)(data);
  return type === 'object' && typeof data.asymmetricMatch === 'function';
}
const diff = (a, b, options) =>
  shouldPrintDiff(a, b) ? (0, _jestDiff.diff)(a, b, options) : null;
exports.diff = diff;
const pluralize = (word, count) =>
  `${NUMBERS[count] || count} ${word}${count === 1 ? '' : 's'}`;

// To display lines of labeled values as two columns with monospace alignment:
// given the strings which will describe the values,
// return function which given each string, returns the label:
// string, colon, space, and enough padding spaces to align the value.
exports.pluralize = pluralize;
const getLabelPrinter = (...strings) => {
  const maxLength = strings.reduce(
    (max, string) => (string.length > max ? string.length : max),
    0
  );
  return string => `${string}: ${' '.repeat(maxLength - string.length)}`;
};
exports.getLabelPrinter = getLabelPrinter;
const matcherErrorMessage = (
  hint,
  generic,
  specific // incorrect value returned from call to printWithType
) =>
  `${hint}\n\n${_chalk.default.bold('Matcher error')}: ${generic}${
    typeof specific === 'string' ? `\n\n${specific}` : ''
  }`;

// Display assertion for the report when a test fails.
// New format: rejects/resolves, not, and matcher name have black color
// Old format: matcher name has dim color
exports.matcherErrorMessage = matcherErrorMessage;
const matcherHint = (
  matcherName,
  received = 'received',
  expected = 'expected',
  options = {}
) => {
  const {
    comment = '',
    expectedColor = EXPECTED_COLOR,
    isDirectExpectCall = false,
    // seems redundant with received === ''
    isNot = false,
    promise = '',
    receivedColor = RECEIVED_COLOR,
    secondArgument = '',
    secondArgumentColor = EXPECTED_COLOR
  } = options;
  let hint = '';
  let dimString = 'expect'; // concatenate adjacent dim substrings

  if (!isDirectExpectCall && received !== '') {
    hint += DIM_COLOR(`${dimString}(`) + receivedColor(received);
    dimString = ')';
  }
  if (promise !== '') {
    hint += DIM_COLOR(`${dimString}.`) + promise;
    dimString = '';
  }
  if (isNot) {
    hint += `${DIM_COLOR(`${dimString}.`)}not`;
    dimString = '';
  }
  if (matcherName.includes('.')) {
    // Old format: for backward compatibility,
    // especially without promise or isNot options
    dimString += matcherName;
  } else {
    // New format: omit period from matcherName arg
    hint += DIM_COLOR(`${dimString}.`) + matcherName;
    dimString = '';
  }
  if (expected === '') {
    dimString += '()';
  } else {
    hint += DIM_COLOR(`${dimString}(`) + expectedColor(expected);
    if (secondArgument) {
      hint += DIM_COLOR(', ') + secondArgumentColor(secondArgument);
    }
    dimString = ')';
  }
  if (comment !== '') {
    dimString += ` // ${comment}`;
  }
  if (dimString !== '') {
    hint += DIM_COLOR(dimString);
  }
  return hint;
};
exports.matcherHint = matcherHint;
