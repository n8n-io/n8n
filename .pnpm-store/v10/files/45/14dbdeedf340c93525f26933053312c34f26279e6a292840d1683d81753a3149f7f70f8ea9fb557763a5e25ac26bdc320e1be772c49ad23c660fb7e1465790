var Hack = require('./hack');

var Marker = require('../tokenizer/marker');
var Token = require('../tokenizer/token');

var Match = {
  ASTERISK: '*',
  BACKSLASH: '\\',
  BANG: '!',
  BANG_SUFFIX_PATTERN: /!\w+$/,
  IMPORTANT_TOKEN: '!important',
  IMPORTANT_TOKEN_PATTERN: new RegExp('!important$', 'i'),
  IMPORTANT_WORD: 'important',
  IMPORTANT_WORD_PATTERN: new RegExp('important$', 'i'),
  SUFFIX_BANG_PATTERN: /!$/,
  UNDERSCORE: '_',
  VARIABLE_REFERENCE_PATTERN: /var\(--.+\)$/
};

function wrapAll(properties, includeVariable, skipProperties) {
  var wrapped = [];
  var single;
  var property;
  var i;

  for (i = properties.length - 1; i >= 0; i--) {
    property = properties[i];

    if (property[0] != Token.PROPERTY) {
      continue;
    }

    if (!includeVariable && someVariableReferences(property)) {
      continue;
    }

    if (skipProperties && skipProperties.indexOf(property[1][1]) > -1) {
      continue;
    }

    single = wrapSingle(property);
    single.all = properties;
    single.position = i;
    wrapped.unshift(single);
  }

  return wrapped;
}

function someVariableReferences(property) {
  var i, l;
  var value;

  // skipping `property` and property name tokens
  for (i = 2, l = property.length; i < l; i++) {
    value = property[i];

    if (value[0] != Token.PROPERTY_VALUE) {
      continue;
    }

    if (isVariableReference(value[1])) {
      return true;
    }
  }

  return false;
}

function isVariableReference(value) {
  return Match.VARIABLE_REFERENCE_PATTERN.test(value);
}

function isMultiplex(property) {
  var value;
  var i, l;

  for (i = 3, l = property.length; i < l; i++) {
    value = property[i];

    if (value[0] == Token.PROPERTY_VALUE && (value[1] == Marker.COMMA || value[1] == Marker.FORWARD_SLASH)) {
      return true;
    }
  }

  return false;
}

function hackFrom(property) {
  var match = false;
  var name = property[1][1];
  var lastValue = property[property.length - 1];

  if (name[0] == Match.UNDERSCORE) {
    match = [Hack.UNDERSCORE];
  } else if (name[0] == Match.ASTERISK) {
    match = [Hack.ASTERISK];
  } else if (lastValue[1][0] == Match.BANG && !lastValue[1].match(Match.IMPORTANT_WORD_PATTERN)) {
    match = [Hack.BANG];
  } else if (lastValue[1].indexOf(Match.BANG) > 0 && !lastValue[1].match(Match.IMPORTANT_WORD_PATTERN) && Match.BANG_SUFFIX_PATTERN.test(lastValue[1])) {
    match = [Hack.BANG];
  } else if (lastValue[1].indexOf(Match.BACKSLASH) > 0 && lastValue[1].indexOf(Match.BACKSLASH) == lastValue[1].length - Match.BACKSLASH.length - 1) {
    match = [Hack.BACKSLASH, lastValue[1].substring(lastValue[1].indexOf(Match.BACKSLASH) + 1)];
  } else if (lastValue[1].indexOf(Match.BACKSLASH) === 0 && lastValue[1].length == 2) {
    match = [Hack.BACKSLASH, lastValue[1].substring(1)];
  }

  return match;
}

function isImportant(property) {
  if (property.length < 3)
    return false;

  var lastValue = property[property.length - 1];
  if (Match.IMPORTANT_TOKEN_PATTERN.test(lastValue[1])) {
    return true;
  } else if (Match.IMPORTANT_WORD_PATTERN.test(lastValue[1]) && Match.SUFFIX_BANG_PATTERN.test(property[property.length - 2][1])) {
    return true;
  }

  return false;
}

function stripImportant(property) {
  var lastValue = property[property.length - 1];
  var oneButLastValue = property[property.length - 2];

  if (Match.IMPORTANT_TOKEN_PATTERN.test(lastValue[1])) {
    lastValue[1] = lastValue[1].replace(Match.IMPORTANT_TOKEN_PATTERN, '');
  } else {
    lastValue[1] = lastValue[1].replace(Match.IMPORTANT_WORD_PATTERN, '');
    oneButLastValue[1] = oneButLastValue[1].replace(Match.SUFFIX_BANG_PATTERN, '');
  }

  if (lastValue[1].length === 0) {
    property.pop();
  }

  if (oneButLastValue[1].length === 0) {
    property.pop();
  }
}

function stripPrefixHack(property) {
  property[1][1] = property[1][1].substring(1);
}

function stripSuffixHack(property, hackFrom) {
  var lastValue = property[property.length - 1];
  lastValue[1] = lastValue[1]
    .substring(0, lastValue[1].indexOf(hackFrom[0] == Hack.BACKSLASH ? Match.BACKSLASH : Match.BANG))
    .trim();

  if (lastValue[1].length === 0) {
    property.pop();
  }
}

function wrapSingle(property) {
  var importantProperty = isImportant(property);
  if (importantProperty) {
    stripImportant(property);
  }

  var whichHack = hackFrom(property);
  if (whichHack[0] == Hack.ASTERISK || whichHack[0] == Hack.UNDERSCORE) {
    stripPrefixHack(property);
  } else if (whichHack[0] == Hack.BACKSLASH || whichHack[0] == Hack.BANG) {
    stripSuffixHack(property, whichHack);
  }

  return {
    block: property[2] && property[2][0] == Token.PROPERTY_BLOCK,
    components: [],
    dirty: false,
    hack: whichHack,
    important: importantProperty,
    name: property[1][1],
    multiplex: property.length > 3 ? isMultiplex(property) : false,
    position: 0,
    shorthand: false,
    unused: false,
    value: property.slice(2)
  };
}

module.exports = {
  all: wrapAll,
  single: wrapSingle
};
