var roundingPrecisionFrom = require('./rounding-precision').roundingPrecisionFrom;

var override = require('../utils/override');

var OptimizationLevel = {
  Zero: '0',
  One: '1',
  Two: '2'
};

var DEFAULTS = {};

DEFAULTS[OptimizationLevel.Zero] = {};
DEFAULTS[OptimizationLevel.One] = {
  cleanupCharsets: true,
  normalizeUrls: true,
  optimizeBackground: true,
  optimizeBorderRadius: true,
  optimizeFilter: true,
  optimizeFontWeight: true,
  optimizeOutline: true,
  removeEmpty: true,
  removeNegativePaddings: true,
  removeQuotes: true,
  removeWhitespace: true,
  replaceMultipleZeros: true,
  replaceTimeUnits: true,
  replaceZeroUnits: true,
  roundingPrecision: roundingPrecisionFrom(undefined),
  selectorsSortingMethod: 'standard',
  specialComments: 'all',
  tidyAtRules: true,
  tidyBlockScopes: true,
  tidySelectors: true,
  transform: noop
};
DEFAULTS[OptimizationLevel.Two] = {
  mergeAdjacentRules: true,
  mergeIntoShorthands: true,
  mergeMedia: true,
  mergeNonAdjacentRules: true,
  mergeSemantically: false,
  overrideProperties: true,
  removeEmpty: true,
  reduceNonAdjacentRules: true,
  removeDuplicateFontRules: true,
  removeDuplicateMediaBlocks: true,
  removeDuplicateRules: true,
  removeUnusedAtRules: false,
  restructureRules: false,
  skipProperties: []
};

var ALL_KEYWORD_1 = '*';
var ALL_KEYWORD_2 = 'all';
var FALSE_KEYWORD_1 = 'false';
var FALSE_KEYWORD_2 = 'off';
var TRUE_KEYWORD_1 = 'true';
var TRUE_KEYWORD_2 = 'on';

var LIST_VALUE_SEPARATOR = ',';
var OPTION_SEPARATOR = ';';
var OPTION_VALUE_SEPARATOR = ':';

function noop() {}

function optimizationLevelFrom(source) {
  var level = override(DEFAULTS, {});
  var Zero = OptimizationLevel.Zero;
  var One = OptimizationLevel.One;
  var Two = OptimizationLevel.Two;


  if (undefined === source) {
    delete level[Two];
    return level;
  }

  if (typeof source == 'string') {
    source = parseInt(source);
  }

  if (typeof source == 'number' && source === parseInt(Two)) {
    return level;
  }

  if (typeof source == 'number' && source === parseInt(One)) {
    delete level[Two];
    return level;
  }

  if (typeof source == 'number' && source === parseInt(Zero)) {
    delete level[Two];
    delete level[One];
    return level;
  }

  if (typeof source == 'object') {
    source = covertValuesToHashes(source);
  }

  if (One in source && 'roundingPrecision' in source[One]) {
    source[One].roundingPrecision = roundingPrecisionFrom(source[One].roundingPrecision);
  }

  if (Two in source && 'skipProperties' in source[Two] && typeof(source[Two].skipProperties) == 'string') {
    source[Two].skipProperties = source[Two].skipProperties.split(LIST_VALUE_SEPARATOR);
  }

  if (Zero in source || One in source || Two in source) {
    level[Zero] = override(level[Zero], source[Zero]);
  }

  if (One in source && ALL_KEYWORD_1 in source[One]) {
    level[One] = override(level[One], defaults(One, normalizeValue(source[One][ALL_KEYWORD_1])));
    delete source[One][ALL_KEYWORD_1];
  }

  if (One in source && ALL_KEYWORD_2 in source[One]) {
    level[One] = override(level[One], defaults(One, normalizeValue(source[One][ALL_KEYWORD_2])));
    delete source[One][ALL_KEYWORD_2];
  }

  if (One in source || Two in source) {
    level[One] = override(level[One], source[One]);
  } else {
    delete level[One];
  }

  if (Two in source && ALL_KEYWORD_1 in source[Two]) {
    level[Two] = override(level[Two], defaults(Two, normalizeValue(source[Two][ALL_KEYWORD_1])));
    delete source[Two][ALL_KEYWORD_1];
  }

  if (Two in source && ALL_KEYWORD_2 in source[Two]) {
    level[Two] = override(level[Two], defaults(Two, normalizeValue(source[Two][ALL_KEYWORD_2])));
    delete source[Two][ALL_KEYWORD_2];
  }

  if (Two in source) {
    level[Two] = override(level[Two], source[Two]);
  } else {
    delete level[Two];
  }

  return level;
}

function defaults(level, value) {
  var options = override(DEFAULTS[level], {});
  var key;

  for (key in options) {
    if (typeof options[key] == 'boolean') {
      options[key] = value;
    }
  }

  return options;
}

function normalizeValue(value) {
  switch (value) {
    case FALSE_KEYWORD_1:
    case FALSE_KEYWORD_2:
      return false;
    case TRUE_KEYWORD_1:
    case TRUE_KEYWORD_2:
      return true;
    default:
      return value;
  }
}

function covertValuesToHashes(source) {
  var clonedSource = override(source, {});
  var level;
  var i;

  for (i = 0; i <= 2; i++) {
    level = '' + i;

    if (level in clonedSource && (clonedSource[level] === undefined || clonedSource[level] === false)) {
      delete clonedSource[level];
    }

    if (level in clonedSource && clonedSource[level] === true) {
      clonedSource[level] = {};
    }

    if (level in clonedSource && typeof clonedSource[level] == 'string') {
      clonedSource[level] = covertToHash(clonedSource[level], level);
    }
  }

  return clonedSource;
}

function covertToHash(asString, level) {
  return asString
    .split(OPTION_SEPARATOR)
    .reduce(function (accumulator, directive) {
      var parts = directive.split(OPTION_VALUE_SEPARATOR);
      var name = parts[0];
      var value = parts[1];
      var normalizedValue = normalizeValue(value);

      if (ALL_KEYWORD_1 == name || ALL_KEYWORD_2 == name) {
        accumulator = override(accumulator, defaults(level, normalizedValue));
      } else {
        accumulator[name] = normalizedValue;
      }

      return accumulator;
    }, {});
}

module.exports = {
  OptimizationLevel: OptimizationLevel,
  optimizationLevelFrom: optimizationLevelFrom,
};
