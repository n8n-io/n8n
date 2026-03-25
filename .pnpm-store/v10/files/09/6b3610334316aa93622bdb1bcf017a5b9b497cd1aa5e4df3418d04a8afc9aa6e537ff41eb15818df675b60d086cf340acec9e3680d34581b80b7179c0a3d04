var shortenHex = require('./shorten-hex');
var shortenHsl = require('./shorten-hsl');
var shortenRgb = require('./shorten-rgb');
var sortSelectors = require('./sort-selectors');
var tidyRules = require('./tidy-rules');
var tidyBlock = require('./tidy-block');
var tidyAtRule = require('./tidy-at-rule');

var Hack = require('../hack');
var removeUnused = require('../remove-unused');
var restoreFromOptimizing = require('../restore-from-optimizing');
var wrapForOptimizing = require('../wrap-for-optimizing').all;

var OptimizationLevel = require('../../options/optimization-level').OptimizationLevel;

var Token = require('../../tokenizer/token');
var Marker = require('../../tokenizer/marker');

var formatPosition = require('../../utils/format-position');
var split = require('../../utils/split');

var serializeRules = require('../../writer/one-time').rules;

var IgnoreProperty = 'ignore-property';

var CHARSET_TOKEN = '@charset';
var CHARSET_REGEXP = new RegExp('^' + CHARSET_TOKEN, 'i');

var DEFAULT_ROUNDING_PRECISION = require('../../options/rounding-precision').DEFAULT;

var WHOLE_PIXEL_VALUE = /(?:^|\s|\()(-?\d+)px/;
var TIME_VALUE = /^(\-?[\d\.]+)(m?s)$/;

var HEX_VALUE_PATTERN = /[0-9a-f]/i;
var PROPERTY_NAME_PATTERN = /^(?:\-chrome\-|\-[\w\-]+\w|\w[\w\-]+\w|\-\-\S+)$/;
var IMPORT_PREFIX_PATTERN = /^@import/i;
var QUOTED_PATTERN = /^('.*'|".*")$/;
var QUOTED_BUT_SAFE_PATTERN = /^['"][a-zA-Z][a-zA-Z\d\-_]+['"]$/;
var URL_PREFIX_PATTERN = /^url\(/i;
var LOCAL_PREFIX_PATTERN = /^local\(/i;
var VARIABLE_NAME_PATTERN = /^--\S+$/;

function isLocal(value){
  return LOCAL_PREFIX_PATTERN.test(value);
}

function isNegative(value) {
  return value && value[1][0] == '-' && parseFloat(value[1]) < 0;
}

function isQuoted(value) {
  return QUOTED_PATTERN.test(value);
}

function isUrl(value) {
  return URL_PREFIX_PATTERN.test(value);
}

function normalizeUrl(value) {
  return value
    .replace(URL_PREFIX_PATTERN, 'url(')
    .replace(/\\?\n|\\?\r\n/g, '');
}

function optimizeBackground(property) {
  var values = property.value;

  if (values.length == 1 && values[0][1] == 'none') {
    values[0][1] = '0 0';
  }

  if (values.length == 1 && values[0][1] == 'transparent') {
    values[0][1] = '0 0';
  }
}

function optimizeBorderRadius(property) {
  var values = property.value;
  var spliceAt;

  if (values.length == 3 && values[1][1] == '/' && values[0][1] == values[2][1]) {
    spliceAt = 1;
  } else if (values.length == 5 && values[2][1] == '/' && values[0][1] == values[3][1] && values[1][1] == values[4][1]) {
    spliceAt = 2;
  } else if (values.length == 7 && values[3][1] == '/' && values[0][1] == values[4][1] && values[1][1] == values[5][1] && values[2][1] == values[6][1]) {
    spliceAt = 3;
  } else if (values.length == 9 && values[4][1] == '/' && values[0][1] == values[5][1] && values[1][1] == values[6][1] && values[2][1] == values[7][1] && values[3][1] == values[8][1]) {
    spliceAt = 4;
  }

  if (spliceAt) {
    property.value.splice(spliceAt);
    property.dirty = true;
  }
}

/**
 * @param {string} name
 * @param {string} value
 * @param {Object} compatibility
 * @return {string}
 */
function optimizeColors(name, value, compatibility) {
  if (!value.match(/#|rgb|hsl/gi)) {
    return shortenHex(value);
  }

  value = value
    .replace(/(rgb|hsl)a?\((\-?\d+),(\-?\d+\%?),(\-?\d+\%?),(0*[1-9]+[0-9]*(\.?\d*)?)\)/gi, function (match, colorFn, p1, p2, p3, alpha) {
      return (parseInt(alpha, 10) >= 1 ? colorFn + '(' + [p1,p2,p3].join(',') + ')' : match);
    })
    .replace(/rgb\((\-?\d+),(\-?\d+),(\-?\d+)\)/gi, function (match, red, green, blue) {
      return shortenRgb(red, green, blue);
    })
    .replace(/hsl\((-?\d+),(-?\d+)%?,(-?\d+)%?\)/gi, function (match, hue, saturation, lightness) {
      return shortenHsl(hue, saturation, lightness);
    })
    .replace(/(^|[^='"])#([0-9a-f]{6})/gi, function (match, prefix, color, at, inputValue) {
      var suffix = inputValue[at + match.length];

      if (suffix && HEX_VALUE_PATTERN.test(suffix)) {
        return match;
      } else if (color[0] == color[1] && color[2] == color[3] && color[4] == color[5]) {
        return (prefix + '#' + color[0] + color[2] + color[4]).toLowerCase();
      } else {
        return (prefix + '#' + color).toLowerCase();
      }
    })
    .replace(/(^|[^='"])#([0-9a-f]{3})/gi, function (match, prefix, color) {
      return prefix + '#' + color.toLowerCase();
    })
    .replace(/(rgb|rgba|hsl|hsla)\(([^\)]+)\)/gi, function (match, colorFunction, colorDef) {
      var tokens = colorDef.split(',');
      var colorFnLowercase = colorFunction && colorFunction.toLowerCase();
      var applies = (colorFnLowercase == 'hsl' && tokens.length == 3) ||
        (colorFnLowercase == 'hsla' && tokens.length == 4) ||
        (colorFnLowercase == 'rgb' && tokens.length === 3 && colorDef.indexOf('%') > 0) ||
        (colorFnLowercase == 'rgba' && tokens.length == 4 && colorDef.indexOf('%') > 0);

      if (!applies) {
        return match;
      }

      if (tokens[1].indexOf('%') == -1) {
        tokens[1] += '%';
      }

      if (tokens[2].indexOf('%') == -1) {
        tokens[2] += '%';
      }

      return colorFunction + '(' + tokens.join(',') + ')';
    });

  if (compatibility.colors.opacity && name.indexOf('background') == -1) {
    value = value.replace(/(?:rgba|hsla)\(0,0%?,0%?,0\)/g, function (match) {
      if (split(value, ',').pop().indexOf('gradient(') > -1) {
        return match;
      }

      return 'transparent';
    });
  }

  return shortenHex(value);
}

function optimizeFilter(property) {
  if (property.value.length == 1) {
    property.value[0][1] = property.value[0][1].replace(/progid:DXImageTransform\.Microsoft\.(Alpha|Chroma)(\W)/, function (match, filter, suffix) {
      return filter.toLowerCase() + suffix;
    });
  }

  property.value[0][1] = property.value[0][1]
    .replace(/,(\S)/g, ', $1')
    .replace(/ ?= ?/g, '=');
}

function optimizeFontWeight(property, atIndex) {
  var value = property.value[atIndex][1];

  if (value == 'normal') {
    value = '400';
  } else if (value == 'bold') {
    value = '700';
  }

  property.value[atIndex][1] = value;
}

function optimizeMultipleZeros(property) {
  var values = property.value;
  var spliceAt;

  if (values.length == 4 && values[0][1] === '0' && values[1][1] === '0' && values[2][1] === '0' && values[3][1] === '0') {
    if (property.name.indexOf('box-shadow') > -1) {
      spliceAt = 2;
    } else {
      spliceAt = 1;
    }
  }

  if (spliceAt) {
    property.value.splice(spliceAt);
    property.dirty = true;
  }
}

function optimizeOutline(property) {
  var values = property.value;

  if (values.length == 1 && values[0][1] == 'none') {
    values[0][1] = '0';
  }
}

function optimizePixelLengths(_, value, compatibility) {
  if (!WHOLE_PIXEL_VALUE.test(value)) {
    return value;
  }

  return value.replace(WHOLE_PIXEL_VALUE, function (match, val) {
    var newValue;
    var intVal = parseInt(val);

    if (intVal === 0) {
      return match;
    }

    if (compatibility.properties.shorterLengthUnits && compatibility.units.pt && intVal * 3 % 4 === 0) {
      newValue = intVal * 3 / 4 + 'pt';
    }

    if (compatibility.properties.shorterLengthUnits && compatibility.units.pc && intVal % 16 === 0) {
      newValue = intVal / 16 + 'pc';
    }

    if (compatibility.properties.shorterLengthUnits && compatibility.units.in && intVal % 96 === 0) {
      newValue = intVal / 96 + 'in';
    }

    if (newValue) {
      newValue = match.substring(0, match.indexOf(val)) + newValue;
    }

    return newValue && newValue.length < match.length ? newValue : match;
  });
}

function optimizePrecision(_, value, precisionOptions) {
  if (!precisionOptions.enabled || value.indexOf('.') === -1) {
    return value;
  }

  return value
    .replace(precisionOptions.decimalPointMatcher, '$1$2$3')
    .replace(precisionOptions.zeroMatcher, function (match, integerPart, fractionPart, unit) {
      var multiplier = precisionOptions.units[unit].multiplier;
      var parsedInteger = parseInt(integerPart);
      var integer = isNaN(parsedInteger) ? 0 : parsedInteger;
      var fraction = parseFloat(fractionPart);

      return Math.round((integer + fraction) * multiplier) / multiplier + unit;
    });
}

function optimizeTimeUnits(_, value) {
  if (!TIME_VALUE.test(value))
    return value;

  return value.replace(TIME_VALUE, function (match, val, unit) {
    var newValue;

    if (unit == 'ms') {
      newValue = parseInt(val) / 1000 + 's';
    } else if (unit == 's') {
      newValue = parseFloat(val) * 1000 + 'ms';
    }

    return newValue.length < match.length ? newValue : match;
  });
}

function optimizeUnits(name, value, unitsRegexp) {
  if (/^(?:\-moz\-calc|\-webkit\-calc|calc|rgb|hsl|rgba|hsla)\(/.test(value)) {
    return value;
  }

  if (name == 'flex' || name == '-ms-flex' || name == '-webkit-flex' || name == 'flex-basis' || name == '-webkit-flex-basis') {
    return value;
  }

  if (value.indexOf('%') > 0 && (name == 'height' || name == 'max-height' || name == 'width' || name == 'max-width')) {
    return value;
  }

  return value
    .replace(unitsRegexp, '$1' + '0' + '$2')
    .replace(unitsRegexp, '$1' + '0' + '$2');
}

function optimizeWhitespace(name, value) {
  if (name.indexOf('filter') > -1 || value.indexOf(' ') == -1 || value.indexOf('expression') === 0) {
    return value;
  }

  if (value.indexOf(Marker.SINGLE_QUOTE) > -1 || value.indexOf(Marker.DOUBLE_QUOTE) > -1) {
    return value;
  }

  value = value.replace(/\s+/g, ' ');

  if (value.indexOf('calc') > -1) {
    value = value.replace(/\) ?\/ ?/g, ')/ ');
  }

  return value
    .replace(/(\(;?)\s+/g, '$1')
    .replace(/\s+(;?\))/g, '$1')
    .replace(/, /g, ',');
}

function optimizeZeroDegUnit(_, value) {
  if (value.indexOf('0deg') == -1) {
    return value;
  }

  return value.replace(/\(0deg\)/g, '(0)');
}

function optimizeZeroUnits(name, value) {
  if (value.indexOf('0') == -1) {
    return value;
  }

  if (value.indexOf('-') > -1) {
    value = value
      .replace(/([^\w\d\-]|^)\-0([^\.]|$)/g, '$10$2')
      .replace(/([^\w\d\-]|^)\-0([^\.]|$)/g, '$10$2');
  }

  return value
    .replace(/(^|\s)0+([1-9])/g, '$1$2')
    .replace(/(^|\D)\.0+(\D|$)/g, '$10$2')
    .replace(/(^|\D)\.0+(\D|$)/g, '$10$2')
    .replace(/\.([1-9]*)0+(\D|$)/g, function (match, nonZeroPart, suffix) {
      return (nonZeroPart.length > 0 ? '.' : '') + nonZeroPart + suffix;
    })
    .replace(/(^|\D)0\.(\d)/g, '$1.$2');
}

function removeQuotes(name, value) {
  if (name == 'content' || name.indexOf('font-variation-settings') > -1 || name.indexOf('font-feature-settings') > -1 || name == 'grid' || name.indexOf('grid-') > -1) {
    return value;
  }

  return QUOTED_BUT_SAFE_PATTERN.test(value) ?
    value.substring(1, value.length - 1) :
    value;
}

function removeUrlQuotes(value) {
  return /^url\(['"].+['"]\)$/.test(value) && !/^url\(['"].*[\*\s\(\)'"].*['"]\)$/.test(value) && !/^url\(['"]data:[^;]+;charset/.test(value) ?
    value.replace(/["']/g, '') :
    value;
}

function transformValue(propertyName, propertyValue, rule, transformCallback) {
  var selector = serializeRules(rule);
  var transformedValue = transformCallback(propertyName, propertyValue, selector);

  if (transformedValue === undefined) {
    return propertyValue;
  } else if (transformedValue === false) {
    return IgnoreProperty;
  } else {
    return transformedValue;
  }
}

//

function optimizeBody(rule, properties, context) {
  var options = context.options;
  var levelOptions = options.level[OptimizationLevel.One];
  var property, name, type, value;
  var valueIsUrl;
  var propertyToken;
  var _properties = wrapForOptimizing(properties, true);

  propertyLoop:
  for (var i = 0, l = _properties.length; i < l; i++) {
    property = _properties[i];
    name = property.name;

    if (!PROPERTY_NAME_PATTERN.test(name)) {
      propertyToken = property.all[property.position];
      context.warnings.push('Invalid property name \'' + name + '\' at ' + formatPosition(propertyToken[1][2][0]) + '. Ignoring.');
      property.unused = true;
    }

    if (property.value.length === 0) {
      propertyToken = property.all[property.position];
      context.warnings.push('Empty property \'' + name + '\' at ' + formatPosition(propertyToken[1][2][0]) + '. Ignoring.');
      property.unused = true;
    }

    if (property.hack && (
        (property.hack[0] == Hack.ASTERISK || property.hack[0] == Hack.UNDERSCORE) && !options.compatibility.properties.iePrefixHack ||
        property.hack[0] == Hack.BACKSLASH && !options.compatibility.properties.ieSuffixHack ||
        property.hack[0] == Hack.BANG && !options.compatibility.properties.ieBangHack)) {
      property.unused = true;
    }

    if (levelOptions.removeNegativePaddings && name.indexOf('padding') === 0 && (isNegative(property.value[0]) || isNegative(property.value[1]) || isNegative(property.value[2]) || isNegative(property.value[3]))) {
      property.unused = true;
    }

    if (!options.compatibility.properties.ieFilters && isLegacyFilter(property)) {
      property.unused = true;
    }

    if (property.unused) {
      continue;
    }

    if (property.block) {
      optimizeBody(rule, property.value[0][1], context);
      continue;
    }

    if (VARIABLE_NAME_PATTERN.test(name)) {
      continue;
    }

    for (var j = 0, m = property.value.length; j < m; j++) {
      type = property.value[j][0];
      value = property.value[j][1];
      valueIsUrl = isUrl(value);

      if (type == Token.PROPERTY_BLOCK) {
        property.unused = true;
        context.warnings.push('Invalid value token at ' + formatPosition(value[0][1][2][0]) + '. Ignoring.');
        break;
      }

      if (valueIsUrl && !context.validator.isUrl(value)) {
        property.unused = true;
        context.warnings.push('Broken URL \'' + value + '\' at ' + formatPosition(property.value[j][2][0]) + '. Ignoring.');
        break;
      }

      if (valueIsUrl) {
        value = levelOptions.normalizeUrls ?
          normalizeUrl(value) :
          value;
        value = !options.compatibility.properties.urlQuotes ?
          removeUrlQuotes(value) :
          value;
      } else if (isQuoted(value) || isLocal(value)) {
        value = levelOptions.removeQuotes ?
          removeQuotes(name, value) :
          value;
      } else {
        value = levelOptions.removeWhitespace ?
          optimizeWhitespace(name, value) :
          value;
        value = optimizePrecision(name, value, options.precision);
        value = optimizePixelLengths(name, value, options.compatibility);
        value = levelOptions.replaceTimeUnits ?
          optimizeTimeUnits(name, value) :
          value;
        value = levelOptions.replaceZeroUnits ?
          optimizeZeroUnits(name, value) :
          value;

        if (options.compatibility.properties.zeroUnits) {
          value = optimizeZeroDegUnit(name, value);
          value = optimizeUnits(name, value, options.unitsRegexp);
        }

        if (options.compatibility.properties.colors) {
          value = optimizeColors(name, value, options.compatibility);
        }
      }

      value = transformValue(name, value, rule, levelOptions.transform);

      if (value === IgnoreProperty) {
        property.unused = true;
        continue propertyLoop;
      }

      property.value[j][1] = value;
    }

    if (levelOptions.replaceMultipleZeros) {
      optimizeMultipleZeros(property);
    }

    if (name == 'background' && levelOptions.optimizeBackground) {
      optimizeBackground(property);
    } else if (name.indexOf('border') === 0 && name.indexOf('radius') > 0 && levelOptions.optimizeBorderRadius) {
      optimizeBorderRadius(property);
    } else if (name == 'filter'&& levelOptions.optimizeFilter && options.compatibility.properties.ieFilters) {
      optimizeFilter(property);
    } else if (name == 'font-weight' && levelOptions.optimizeFontWeight) {
      optimizeFontWeight(property, 0);
    } else if (name == 'outline' && levelOptions.optimizeOutline) {
      optimizeOutline(property);
    }
  }

  restoreFromOptimizing(_properties);
  removeUnused(_properties);
  removeComments(properties, options);
}

function removeComments(tokens, options) {
  var token;
  var i;

  for (i = 0; i < tokens.length; i++) {
    token = tokens[i];

    if (token[0] != Token.COMMENT) {
      continue;
    }

    optimizeComment(token, options);

    if (token[1].length === 0) {
      tokens.splice(i, 1);
      i--;
    }
  }
}

function optimizeComment(token, options) {
  if (token[1][2] == Marker.EXCLAMATION && (options.level[OptimizationLevel.One].specialComments == 'all' || options.commentsKept < options.level[OptimizationLevel.One].specialComments)) {
    options.commentsKept++;
    return;
  }

  token[1] = [];
}

function cleanupCharsets(tokens) {
  var hasCharset = false;

  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];

    if (token[0] != Token.AT_RULE)
      continue;

    if (!CHARSET_REGEXP.test(token[1]))
      continue;

    if (hasCharset || token[1].indexOf(CHARSET_TOKEN) == -1) {
      tokens.splice(i, 1);
      i--;
      l--;
    } else {
      hasCharset = true;
      tokens.splice(i, 1);
      tokens.unshift([Token.AT_RULE, token[1].replace(CHARSET_REGEXP, CHARSET_TOKEN)]);
    }
  }
}

function buildUnitRegexp(options) {
  var units = ['px', 'em', 'ex', 'cm', 'mm', 'in', 'pt', 'pc', '%'];
  var otherUnits = ['ch', 'rem', 'vh', 'vm', 'vmax', 'vmin', 'vw'];

  otherUnits.forEach(function (unit) {
    if (options.compatibility.units[unit]) {
      units.push(unit);
    }
  });

  return new RegExp('(^|\\s|\\(|,)0(?:' + units.join('|') + ')(\\W|$)', 'g');
}

function buildPrecisionOptions(roundingPrecision) {
  var precisionOptions = {
    matcher: null,
    units: {},
  };
  var optimizable = [];
  var unit;
  var value;

  for (unit in roundingPrecision) {
    value = roundingPrecision[unit];

    if (value != DEFAULT_ROUNDING_PRECISION) {
      precisionOptions.units[unit] = {};
      precisionOptions.units[unit].value = value;
      precisionOptions.units[unit].multiplier = Math.pow(10, value);

      optimizable.push(unit);
    }
  }

  if (optimizable.length > 0) {
    precisionOptions.enabled = true;
    precisionOptions.decimalPointMatcher = new RegExp('(\\d)\\.($|' + optimizable.join('|') + ')($|\\W)', 'g');
    precisionOptions.zeroMatcher = new RegExp('(\\d*)(\\.\\d+)(' + optimizable.join('|') + ')', 'g');
  }

  return precisionOptions;
}

function isImport(token) {
  return IMPORT_PREFIX_PATTERN.test(token[1]);
}

function isLegacyFilter(property) {
  var value;

  if (property.name == 'filter' || property.name == '-ms-filter') {
    value = property.value[0][1];

    return value.indexOf('progid') > -1 ||
      value.indexOf('alpha') === 0 ||
      value.indexOf('chroma') === 0;
  } else {
    return false;
  }
}

function level1Optimize(tokens, context) {
  var options = context.options;
  var levelOptions = options.level[OptimizationLevel.One];
  var ie7Hack = options.compatibility.selectors.ie7Hack;
  var adjacentSpace = options.compatibility.selectors.adjacentSpace;
  var spaceAfterClosingBrace = options.compatibility.properties.spaceAfterClosingBrace;
  var format = options.format;
  var mayHaveCharset = false;
  var afterRules = false;

  options.unitsRegexp = options.unitsRegexp || buildUnitRegexp(options);
  options.precision = options.precision || buildPrecisionOptions(levelOptions.roundingPrecision);
  options.commentsKept = options.commentsKept || 0;

  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];

    switch (token[0]) {
      case Token.AT_RULE:
        token[1] = isImport(token) && afterRules ? '' : token[1];
        token[1] = levelOptions.tidyAtRules ? tidyAtRule(token[1]) : token[1];
        mayHaveCharset = true;
        break;
      case Token.AT_RULE_BLOCK:
        optimizeBody(token[1], token[2], context);
        afterRules = true;
        break;
      case Token.NESTED_BLOCK:
        token[1] = levelOptions.tidyBlockScopes ? tidyBlock(token[1], spaceAfterClosingBrace) : token[1];
        level1Optimize(token[2], context);
        afterRules = true;
        break;
      case Token.COMMENT:
        optimizeComment(token, options);
        break;
      case Token.RULE:
        token[1] = levelOptions.tidySelectors ? tidyRules(token[1], !ie7Hack, adjacentSpace, format, context.warnings) : token[1];
        token[1] = token[1].length > 1 ? sortSelectors(token[1], levelOptions.selectorsSortingMethod) : token[1];
        optimizeBody(token[1], token[2], context);
        afterRules = true;
        break;
    }

    if (token[0] == Token.COMMENT && token[1].length === 0 || levelOptions.removeEmpty && (token[1].length === 0 || (token[2] && token[2].length === 0))) {
      tokens.splice(i, 1);
      i--;
      l--;
    }
  }

  if (levelOptions.cleanupCharsets && mayHaveCharset) {
    cleanupCharsets(tokens);
  }

  return tokens;
}

module.exports = level1Optimize;
