'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.printSnapshotAndReceived =
  exports.printReceived =
  exports.printPropertiesAndReceived =
  exports.printExpected =
  exports.noColor =
  exports.matcherHintFromConfig =
  exports.getSnapshotColorForChalkInstance =
  exports.getReceivedColorForChalkInstance =
  exports.bReceivedColor =
  exports.aSnapshotColor =
  exports.SNAPSHOT_ARG =
  exports.PROPERTIES_ARG =
  exports.HINT_ARG =
    void 0;
var _chalk = _interopRequireDefault(require('chalk'));
var _expectUtils = require('@jest/expect-utils');
var _jestDiff = require('jest-diff');
var _jestGetType = require('jest-get-type');
var _jestMatcherUtils = require('jest-matcher-utils');
var _prettyFormat = require('pretty-format');
var _colors = require('./colors');
var _dedentLines = require('./dedentLines');
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

const getSnapshotColorForChalkInstance = chalkInstance => {
  const level = chalkInstance.level;
  if (level === 3) {
    return chalkInstance
      .rgb(
        _colors.aForeground3[0],
        _colors.aForeground3[1],
        _colors.aForeground3[2]
      )
      .bgRgb(
        _colors.aBackground3[0],
        _colors.aBackground3[1],
        _colors.aBackground3[2]
      );
  }
  if (level === 2) {
    return chalkInstance
      .ansi256(_colors.aForeground2)
      .bgAnsi256(_colors.aBackground2);
  }
  return chalkInstance.magenta.bgYellowBright;
};
exports.getSnapshotColorForChalkInstance = getSnapshotColorForChalkInstance;
const getReceivedColorForChalkInstance = chalkInstance => {
  const level = chalkInstance.level;
  if (level === 3) {
    return chalkInstance
      .rgb(
        _colors.bForeground3[0],
        _colors.bForeground3[1],
        _colors.bForeground3[2]
      )
      .bgRgb(
        _colors.bBackground3[0],
        _colors.bBackground3[1],
        _colors.bBackground3[2]
      );
  }
  if (level === 2) {
    return chalkInstance
      .ansi256(_colors.bForeground2)
      .bgAnsi256(_colors.bBackground2);
  }
  return chalkInstance.cyan.bgWhiteBright; // also known as teal
};
exports.getReceivedColorForChalkInstance = getReceivedColorForChalkInstance;
const aSnapshotColor = getSnapshotColorForChalkInstance(_chalk.default);
exports.aSnapshotColor = aSnapshotColor;
const bReceivedColor = getReceivedColorForChalkInstance(_chalk.default);
exports.bReceivedColor = bReceivedColor;
const noColor = string => string;
exports.noColor = noColor;
const HINT_ARG = 'hint';
exports.HINT_ARG = HINT_ARG;
const SNAPSHOT_ARG = 'snapshot';
exports.SNAPSHOT_ARG = SNAPSHOT_ARG;
const PROPERTIES_ARG = 'properties';
exports.PROPERTIES_ARG = PROPERTIES_ARG;
const matcherHintFromConfig = (
  {context: {isNot, promise}, hint, inlineSnapshot, matcherName, properties},
  isUpdatable
) => {
  const options = {
    isNot,
    promise
  };
  if (isUpdatable) {
    options.receivedColor = bReceivedColor;
  }
  let expectedArgument = '';
  if (typeof properties === 'object') {
    expectedArgument = PROPERTIES_ARG;
    if (isUpdatable) {
      options.expectedColor = noColor;
    }
    if (typeof hint === 'string' && hint.length !== 0) {
      options.secondArgument = HINT_ARG;
      options.secondArgumentColor = _jestMatcherUtils.BOLD_WEIGHT;
    } else if (typeof inlineSnapshot === 'string') {
      options.secondArgument = SNAPSHOT_ARG;
      if (isUpdatable) {
        options.secondArgumentColor = aSnapshotColor;
      } else {
        options.secondArgumentColor = noColor;
      }
    }
  } else {
    if (typeof hint === 'string' && hint.length !== 0) {
      expectedArgument = HINT_ARG;
      options.expectedColor = _jestMatcherUtils.BOLD_WEIGHT;
    } else if (typeof inlineSnapshot === 'string') {
      expectedArgument = SNAPSHOT_ARG;
      if (isUpdatable) {
        options.expectedColor = aSnapshotColor;
      }
    }
  }
  return (0, _jestMatcherUtils.matcherHint)(
    matcherName,
    undefined,
    expectedArgument,
    options
  );
};

// Given array of diffs, return string:
// * include common substrings
// * exclude change substrings which have opposite op
// * include change substrings which have argument op
//   with change color only if there is a common substring
exports.matcherHintFromConfig = matcherHintFromConfig;
const joinDiffs = (diffs, op, hasCommon) =>
  diffs.reduce(
    (reduced, diff) =>
      reduced +
      (diff[0] === _jestDiff.DIFF_EQUAL
        ? diff[1]
        : diff[0] !== op
        ? ''
        : hasCommon
        ? (0, _jestMatcherUtils.INVERTED_COLOR)(diff[1])
        : diff[1]),
    ''
  );
const isLineDiffable = received => {
  const receivedType = (0, _jestGetType.getType)(received);
  if ((0, _jestGetType.isPrimitive)(received)) {
    return typeof received === 'string';
  }
  if (
    receivedType === 'date' ||
    receivedType === 'function' ||
    receivedType === 'regexp'
  ) {
    return false;
  }
  if (received instanceof Error) {
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
const printExpected = val =>
  (0, _jestMatcherUtils.EXPECTED_COLOR)((0, _utils.minify)(val));
exports.printExpected = printExpected;
const printReceived = val =>
  (0, _jestMatcherUtils.RECEIVED_COLOR)((0, _utils.minify)(val));
exports.printReceived = printReceived;
const printPropertiesAndReceived = (
  properties,
  received,
  expand // CLI options: true if `--expand` or false if `--no-expand`
) => {
  const aAnnotation = 'Expected properties';
  const bAnnotation = 'Received value';
  if (isLineDiffable(properties) && isLineDiffable(received)) {
    const {replacedExpected, replacedReceived} = (0,
    _jestMatcherUtils.replaceMatchedToAsymmetricMatcher)(
      properties,
      received,
      [],
      []
    );
    return (0, _jestDiff.diffLinesUnified)(
      (0, _utils.serialize)(replacedExpected).split('\n'),
      (0, _utils.serialize)(
        (0, _expectUtils.getObjectSubset)(replacedReceived, replacedExpected)
      ).split('\n'),
      {
        aAnnotation,
        aColor: _jestMatcherUtils.EXPECTED_COLOR,
        bAnnotation,
        bColor: _jestMatcherUtils.RECEIVED_COLOR,
        changeLineTrailingSpaceColor: _chalk.default.bgYellow,
        commonLineTrailingSpaceColor: _chalk.default.bgYellow,
        emptyFirstOrLastLinePlaceholder: '↵',
        // U+21B5
        expand,
        includeChangeCounts: true
      }
    );
  }
  const printLabel = (0, _jestMatcherUtils.getLabelPrinter)(
    aAnnotation,
    bAnnotation
  );
  return `${printLabel(aAnnotation) + printExpected(properties)}\n${printLabel(
    bAnnotation
  )}${printReceived(received)}`;
};
exports.printPropertiesAndReceived = printPropertiesAndReceived;
const MAX_DIFF_STRING_LENGTH = 20000;
const printSnapshotAndReceived = (a, b, received, expand, snapshotFormat) => {
  const aAnnotation = 'Snapshot';
  const bAnnotation = 'Received';
  const aColor = aSnapshotColor;
  const bColor = bReceivedColor;
  const options = {
    aAnnotation,
    aColor,
    bAnnotation,
    bColor,
    changeLineTrailingSpaceColor: noColor,
    commonLineTrailingSpaceColor: _chalk.default.bgYellow,
    emptyFirstOrLastLinePlaceholder: '↵',
    // U+21B5
    expand,
    includeChangeCounts: true
  };
  if (typeof received === 'string') {
    if (
      a.length >= 2 &&
      a.startsWith('"') &&
      a.endsWith('"') &&
      b === (0, _prettyFormat.format)(received)
    ) {
      // If snapshot looks like default serialization of a string
      // and received is string which has default serialization.

      if (!a.includes('\n') && !b.includes('\n')) {
        // If neither string is multiline,
        // display as labels and quoted strings.
        let aQuoted = a;
        let bQuoted = b;
        if (
          a.length - 2 <= MAX_DIFF_STRING_LENGTH &&
          b.length - 2 <= MAX_DIFF_STRING_LENGTH
        ) {
          const diffs = (0, _jestDiff.diffStringsRaw)(
            a.slice(1, -1),
            b.slice(1, -1),
            true
          );
          const hasCommon = diffs.some(
            diff => diff[0] === _jestDiff.DIFF_EQUAL
          );
          aQuoted = `"${joinDiffs(diffs, _jestDiff.DIFF_DELETE, hasCommon)}"`;
          bQuoted = `"${joinDiffs(diffs, _jestDiff.DIFF_INSERT, hasCommon)}"`;
        }
        const printLabel = (0, _jestMatcherUtils.getLabelPrinter)(
          aAnnotation,
          bAnnotation
        );
        return `${printLabel(aAnnotation) + aColor(aQuoted)}\n${printLabel(
          bAnnotation
        )}${bColor(bQuoted)}`;
      }

      // Else either string is multiline, so display as unquoted strings.
      a = (0, _utils.deserializeString)(a); //  hypothetical expected string
      b = received; // not serialized
    }
    // Else expected had custom serialization or was not a string
    // or received has custom serialization.

    return a.length <= MAX_DIFF_STRING_LENGTH &&
      b.length <= MAX_DIFF_STRING_LENGTH
      ? (0, _jestDiff.diffStringsUnified)(a, b, options)
      : (0, _jestDiff.diffLinesUnified)(a.split('\n'), b.split('\n'), options);
  }
  if (isLineDiffable(received)) {
    const aLines2 = a.split('\n');
    const bLines2 = b.split('\n');

    // Fall through to fix a regression for custom serializers
    // like jest-snapshot-serializer-raw that ignore the indent option.
    const b0 = (0, _utils.serialize)(received, 0, snapshotFormat);
    if (b0 !== b) {
      const aLines0 = (0, _dedentLines.dedentLines)(aLines2);
      if (aLines0 !== null) {
        // Compare lines without indentation.
        const bLines0 = b0.split('\n');
        return (0, _jestDiff.diffLinesUnified2)(
          aLines2,
          bLines2,
          aLines0,
          bLines0,
          options
        );
      }
    }

    // Fall back because:
    // * props include a multiline string
    // * text has more than one adjacent line
    // * markup does not close
    return (0, _jestDiff.diffLinesUnified)(aLines2, bLines2, options);
  }
  const printLabel = (0, _jestMatcherUtils.getLabelPrinter)(
    aAnnotation,
    bAnnotation
  );
  return `${printLabel(aAnnotation) + aColor(a)}\n${printLabel(
    bAnnotation
  )}${bColor(b)}`;
};
exports.printSnapshotAndReceived = printSnapshotAndReceived;
