var override = require('../utils/override');

var INTEGER_PATTERN = /^\d+$/;

var ALL_UNITS = ['*', 'all'];
var DEFAULT_PRECISION = 'off'; // all precision changes are disabled
var DIRECTIVES_SEPARATOR = ','; // e.g. *=5,px=3
var DIRECTIVE_VALUE_SEPARATOR = '='; // e.g. *=5

function roundingPrecisionFrom(source) {
  return override(defaults(DEFAULT_PRECISION), buildPrecisionFrom(source));
}

function defaults(value) {
  return {
    'ch': value,
    'cm': value,
    'em': value,
    'ex': value,
    'in': value,
    'mm': value,
    'pc': value,
    'pt': value,
    'px': value,
    'q': value,
    'rem': value,
    'vh': value,
    'vmax': value,
    'vmin': value,
    'vw': value,
    '%': value
  };
}

function buildPrecisionFrom(source) {
  if (source === null || source === undefined) {
    return {};
  }

  if (typeof source == 'boolean') {
    return {};
  }

  if (typeof source == 'number' && source == -1) {
    return defaults(DEFAULT_PRECISION);
  }

  if (typeof source == 'number') {
    return defaults(source);
  }

  if (typeof source == 'string' && INTEGER_PATTERN.test(source)) {
    return defaults(parseInt(source));
  }

  if (typeof source == 'string' && source == DEFAULT_PRECISION) {
    return defaults(DEFAULT_PRECISION);
  }

  if (typeof source == 'object') {
    return source;
  }

  return source
    .split(DIRECTIVES_SEPARATOR)
    .reduce(function (accumulator, directive) {
      var directiveParts = directive.split(DIRECTIVE_VALUE_SEPARATOR);
      var name = directiveParts[0];
      var value = parseInt(directiveParts[1]);

      if (isNaN(value) || value == -1) {
        value = DEFAULT_PRECISION;
      }

      if (ALL_UNITS.indexOf(name) > -1) {
        accumulator = override(accumulator, defaults(value));
      } else {
        accumulator[name] = value;
      }

      return accumulator;
    }, {});
}

module.exports = {
  DEFAULT: DEFAULT_PRECISION,
  roundingPrecisionFrom: roundingPrecisionFrom
};
