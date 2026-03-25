'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
Object.defineProperty(exports, 'DIFF_DELETE', {
  enumerable: true,
  get: function () {
    return _cleanupSemantic.DIFF_DELETE;
  }
});
Object.defineProperty(exports, 'DIFF_EQUAL', {
  enumerable: true,
  get: function () {
    return _cleanupSemantic.DIFF_EQUAL;
  }
});
Object.defineProperty(exports, 'DIFF_INSERT', {
  enumerable: true,
  get: function () {
    return _cleanupSemantic.DIFF_INSERT;
  }
});
Object.defineProperty(exports, 'Diff', {
  enumerable: true,
  get: function () {
    return _cleanupSemantic.Diff;
  }
});
exports.diff = diff;
Object.defineProperty(exports, 'diffLinesRaw', {
  enumerable: true,
  get: function () {
    return _diffLines.diffLinesRaw;
  }
});
Object.defineProperty(exports, 'diffLinesUnified', {
  enumerable: true,
  get: function () {
    return _diffLines.diffLinesUnified;
  }
});
Object.defineProperty(exports, 'diffLinesUnified2', {
  enumerable: true,
  get: function () {
    return _diffLines.diffLinesUnified2;
  }
});
Object.defineProperty(exports, 'diffStringsRaw', {
  enumerable: true,
  get: function () {
    return _printDiffs.diffStringsRaw;
  }
});
Object.defineProperty(exports, 'diffStringsUnified', {
  enumerable: true,
  get: function () {
    return _printDiffs.diffStringsUnified;
  }
});
var _chalk = _interopRequireDefault(require('chalk'));
var _jestGetType = require('jest-get-type');
var _prettyFormat = require('pretty-format');
var _cleanupSemantic = require('./cleanupSemantic');
var _constants = require('./constants');
var _diffLines = require('./diffLines');
var _normalizeDiffOptions = require('./normalizeDiffOptions');
var _printDiffs = require('./printDiffs');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const getCommonMessage = (message, options) => {
  const {commonColor} = (0, _normalizeDiffOptions.normalizeDiffOptions)(
    options
  );
  return commonColor(message);
};
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
const FORMAT_OPTIONS = {
  plugins: PLUGINS
};
const FALLBACK_FORMAT_OPTIONS = {
  callToJSON: false,
  maxDepth: 10,
  plugins: PLUGINS
};

// Generate a string that will highlight the difference between two values
// with green and red. (similar to how github does code diffing)
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function diff(a, b, options) {
  if (Object.is(a, b)) {
    return getCommonMessage(_constants.NO_DIFF_MESSAGE, options);
  }
  const aType = (0, _jestGetType.getType)(a);
  let expectedType = aType;
  let omitDifference = false;
  if (aType === 'object' && typeof a.asymmetricMatch === 'function') {
    if (a.$$typeof !== Symbol.for('jest.asymmetricMatcher')) {
      // Do not know expected type of user-defined asymmetric matcher.
      return null;
    }
    if (typeof a.getExpectedType !== 'function') {
      // For example, expect.anything() matches either null or undefined
      return null;
    }
    expectedType = a.getExpectedType();
    // Primitive types boolean and number omit difference below.
    // For example, omit difference for expect.stringMatching(regexp)
    omitDifference = expectedType === 'string';
  }
  if (expectedType !== (0, _jestGetType.getType)(b)) {
    return (
      '  Comparing two different types of values.' +
      ` Expected ${_chalk.default.green(expectedType)} but ` +
      `received ${_chalk.default.red((0, _jestGetType.getType)(b))}.`
    );
  }
  if (omitDifference) {
    return null;
  }
  switch (aType) {
    case 'string':
      return (0, _diffLines.diffLinesUnified)(
        a.split('\n'),
        b.split('\n'),
        options
      );
    case 'boolean':
    case 'number':
      return comparePrimitive(a, b, options);
    case 'map':
      return compareObjects(sortMap(a), sortMap(b), options);
    case 'set':
      return compareObjects(sortSet(a), sortSet(b), options);
    default:
      return compareObjects(a, b, options);
  }
}
function comparePrimitive(a, b, options) {
  const aFormat = (0, _prettyFormat.format)(a, FORMAT_OPTIONS);
  const bFormat = (0, _prettyFormat.format)(b, FORMAT_OPTIONS);
  return aFormat === bFormat
    ? getCommonMessage(_constants.NO_DIFF_MESSAGE, options)
    : (0, _diffLines.diffLinesUnified)(
        aFormat.split('\n'),
        bFormat.split('\n'),
        options
      );
}
function sortMap(map) {
  return new Map(Array.from(map.entries()).sort());
}
function sortSet(set) {
  return new Set(Array.from(set.values()).sort());
}
function compareObjects(a, b, options) {
  let difference;
  let hasThrown = false;
  try {
    const formatOptions = getFormatOptions(FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a, b, formatOptions, options);
  } catch {
    hasThrown = true;
  }
  const noDiffMessage = getCommonMessage(_constants.NO_DIFF_MESSAGE, options);
  // If the comparison yields no results, compare again but this time
  // without calling `toJSON`. It's also possible that toJSON might throw.
  if (difference === undefined || difference === noDiffMessage) {
    const formatOptions = getFormatOptions(FALLBACK_FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a, b, formatOptions, options);
    if (difference !== noDiffMessage && !hasThrown) {
      difference = `${getCommonMessage(
        _constants.SIMILAR_MESSAGE,
        options
      )}\n\n${difference}`;
    }
  }
  return difference;
}
function getFormatOptions(formatOptions, options) {
  const {compareKeys} = (0, _normalizeDiffOptions.normalizeDiffOptions)(
    options
  );
  return {
    ...formatOptions,
    compareKeys
  };
}
function getObjectsDifference(a, b, formatOptions, options) {
  const formatOptionsZeroIndent = {
    ...formatOptions,
    indent: 0
  };
  const aCompare = (0, _prettyFormat.format)(a, formatOptionsZeroIndent);
  const bCompare = (0, _prettyFormat.format)(b, formatOptionsZeroIndent);
  if (aCompare === bCompare) {
    return getCommonMessage(_constants.NO_DIFF_MESSAGE, options);
  } else {
    const aDisplay = (0, _prettyFormat.format)(a, formatOptions);
    const bDisplay = (0, _prettyFormat.format)(b, formatOptions);
    return (0, _diffLines.diffLinesUnified2)(
      aDisplay.split('\n'),
      bDisplay.split('\n'),
      aCompare.split('\n'),
      bCompare.split('\n'),
      options
    );
  }
}
