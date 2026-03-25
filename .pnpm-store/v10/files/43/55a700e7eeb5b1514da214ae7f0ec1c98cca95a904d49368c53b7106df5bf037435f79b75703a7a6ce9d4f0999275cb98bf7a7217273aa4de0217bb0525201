var systemLineBreak = require('os').EOL;

var override = require('../utils/override');

var Breaks = {
  AfterAtRule: 'afterAtRule',
  AfterBlockBegins: 'afterBlockBegins',
  AfterBlockEnds: 'afterBlockEnds',
  AfterComment: 'afterComment',
  AfterProperty: 'afterProperty',
  AfterRuleBegins: 'afterRuleBegins',
  AfterRuleEnds: 'afterRuleEnds',
  BeforeBlockEnds: 'beforeBlockEnds',
  BetweenSelectors: 'betweenSelectors'
};

var BreakWith = {
  CarriageReturnLineFeed: '\r\n',
  LineFeed: '\n',
  System: systemLineBreak
};

var IndentWith = {
  Space: ' ',
  Tab: '\t'
};

var Spaces = {
  AroundSelectorRelation: 'aroundSelectorRelation',
  BeforeBlockBegins: 'beforeBlockBegins',
  BeforeValue: 'beforeValue'
};

var DEFAULTS = {
  breaks: breaks(false),
  breakWith: BreakWith.System,
  indentBy: 0,
  indentWith: IndentWith.Space,
  spaces: spaces(false),
  wrapAt: false,
  semicolonAfterLastProperty: false
};

var BEAUTIFY_ALIAS = 'beautify';
var KEEP_BREAKS_ALIAS = 'keep-breaks';

var OPTION_SEPARATOR = ';';
var OPTION_NAME_VALUE_SEPARATOR = ':';
var HASH_VALUES_OPTION_SEPARATOR = ',';
var HASH_VALUES_NAME_VALUE_SEPARATOR = '=';

var FALSE_KEYWORD_1 = 'false';
var FALSE_KEYWORD_2 = 'off';
var TRUE_KEYWORD_1 = 'true';
var TRUE_KEYWORD_2 = 'on';

function breaks(value) {
  var breakOptions = {};

  breakOptions[Breaks.AfterAtRule] = value;
  breakOptions[Breaks.AfterBlockBegins] = value;
  breakOptions[Breaks.AfterBlockEnds] = value;
  breakOptions[Breaks.AfterComment] = value;
  breakOptions[Breaks.AfterProperty] = value;
  breakOptions[Breaks.AfterRuleBegins] = value;
  breakOptions[Breaks.AfterRuleEnds] = value;
  breakOptions[Breaks.BeforeBlockEnds] = value;
  breakOptions[Breaks.BetweenSelectors] = value;

  return breakOptions;
}

function spaces(value) {
  var spaceOptions = {};

  spaceOptions[Spaces.AroundSelectorRelation] = value;
  spaceOptions[Spaces.BeforeBlockBegins] = value;
  spaceOptions[Spaces.BeforeValue] = value;

  return spaceOptions;
}

function formatFrom(source) {
  if (source === undefined || source === false) {
    return false;
  }

  if (typeof source == 'object' && 'breakWith' in source) {
    source = override(source, { breakWith: mapBreakWith(source.breakWith) });
  }

  if (typeof source == 'object' && 'indentBy' in source) {
    source = override(source, { indentBy: parseInt(source.indentBy) });
  }

  if (typeof source == 'object' && 'indentWith' in source) {
    source = override(source, { indentWith: mapIndentWith(source.indentWith) });
  }

  if (typeof source == 'object') {
    return override(DEFAULTS, source);
  }

  if (typeof source == 'object') {
    return override(DEFAULTS, source);
  }

  if (typeof source == 'string' && source == BEAUTIFY_ALIAS) {
    return override(DEFAULTS, {
      breaks: breaks(true),
      indentBy: 2,
      spaces: spaces(true)
    });
  }

  if (typeof source == 'string' && source == KEEP_BREAKS_ALIAS) {
    return override(DEFAULTS, {
      breaks: {
        afterAtRule: true,
        afterBlockBegins: true,
        afterBlockEnds: true,
        afterComment: true,
        afterRuleEnds: true,
        beforeBlockEnds: true
      }
    });
  }

  if (typeof source == 'string') {
    return override(DEFAULTS, toHash(source));
  }

  return DEFAULTS;
}

function toHash(string) {
  return string
    .split(OPTION_SEPARATOR)
    .reduce(function (accumulator, directive) {
      var parts = directive.split(OPTION_NAME_VALUE_SEPARATOR);
      var name = parts[0];
      var value = parts[1];

      if (name == 'breaks' || name == 'spaces') {
        accumulator[name] = hashValuesToHash(value);
      } else if (name == 'indentBy' || name == 'wrapAt') {
        accumulator[name] = parseInt(value);
      } else if (name == 'indentWith') {
        accumulator[name] = mapIndentWith(value);
      } else if (name == 'breakWith') {
        accumulator[name] = mapBreakWith(value);
      }

      return accumulator;
    }, {});
}

function hashValuesToHash(string) {
  return string
    .split(HASH_VALUES_OPTION_SEPARATOR)
    .reduce(function (accumulator, directive) {
      var parts = directive.split(HASH_VALUES_NAME_VALUE_SEPARATOR);
      var name = parts[0];
      var value = parts[1];

      accumulator[name] = normalizeValue(value);

      return accumulator;
    }, {});
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

function mapBreakWith(value) {
  switch (value) {
    case 'windows':
    case 'crlf':
    case BreakWith.CarriageReturnLineFeed:
      return BreakWith.CarriageReturnLineFeed;
    case 'unix':
    case 'lf':
    case BreakWith.LineFeed:
      return BreakWith.LineFeed;
    default:
      return systemLineBreak;
  }
}

function mapIndentWith(value) {
  switch (value) {
    case 'space':
      return IndentWith.Space;
    case 'tab':
      return IndentWith.Tab;
    default:
      return value;
  }
}

module.exports = {
  Breaks: Breaks,
  Spaces: Spaces,
  formatFrom: formatFrom
};
