var emptyCharacter = '';

var Breaks = require('../options/format').Breaks;
var Spaces = require('../options/format').Spaces;

var Marker = require('../tokenizer/marker');
var Token = require('../tokenizer/token');

function supportsAfterClosingBrace(token) {
  return token[1][1] == 'background' || token[1][1] == 'transform' || token[1][1] == 'src';
}

function afterClosingBrace(token, valueIndex) {
  return token[valueIndex][1][token[valueIndex][1].length - 1] == Marker.CLOSE_ROUND_BRACKET;
}

function afterComma(token, valueIndex) {
  return token[valueIndex][1] == Marker.COMMA;
}

function afterSlash(token, valueIndex) {
  return token[valueIndex][1] == Marker.FORWARD_SLASH;
}

function beforeComma(token, valueIndex) {
  return token[valueIndex + 1] && token[valueIndex + 1][1] == Marker.COMMA;
}

function beforeSlash(token, valueIndex) {
  return token[valueIndex + 1] && token[valueIndex + 1][1] == Marker.FORWARD_SLASH;
}

function inFilter(token) {
  return token[1][1] == 'filter' || token[1][1] == '-ms-filter';
}

function disallowsSpace(context, token, valueIndex) {
  return !context.spaceAfterClosingBrace && supportsAfterClosingBrace(token) && afterClosingBrace(token, valueIndex) ||
    beforeSlash(token, valueIndex) ||
    afterSlash(token, valueIndex) ||
    beforeComma(token, valueIndex) ||
    afterComma(token, valueIndex);
}

function rules(context, tokens) {
  var store = context.store;

  for (var i = 0, l = tokens.length; i < l; i++) {
    store(context, tokens[i]);

    if (i < l - 1) {
      store(context, comma(context));
    }
  }
}

function body(context, tokens) {
  var lastPropertyAt = lastPropertyIndex(tokens);

  for (var i = 0, l = tokens.length; i < l; i++) {
    property(context, tokens, i, lastPropertyAt);
  }
}

function lastPropertyIndex(tokens) {
  var index = tokens.length - 1;

  for (; index >= 0; index--) {
    if (tokens[index][0] != Token.COMMENT) {
      break;
    }
  }

  return index;
}

function property(context, tokens, position, lastPropertyAt) {
  var store = context.store;
  var token = tokens[position];

  var propertyValue = token[2];
  var isPropertyBlock = propertyValue && propertyValue[0] === Token.PROPERTY_BLOCK;

  var needsSemicolon;
  if ( context.format ) {
    if ( context.format.semicolonAfterLastProperty || isPropertyBlock ) {
      needsSemicolon = true;
    } else if ( position < lastPropertyAt ) {
      needsSemicolon = true;
    } else {
      needsSemicolon = false;
    }
  } else {
    needsSemicolon = position < lastPropertyAt || isPropertyBlock;
  }

  var isLast = position === lastPropertyAt;

  switch (token[0]) {
    case Token.AT_RULE:
      store(context, token);
      store(context, semicolon(context, Breaks.AfterProperty, false));
      break;
    case Token.AT_RULE_BLOCK:
      rules(context, token[1]);
      store(context, openBrace(context, Breaks.AfterRuleBegins, true));
      body(context, token[2]);
      store(context, closeBrace(context, Breaks.AfterRuleEnds, false, isLast));
      break;
    case Token.COMMENT:
      store(context, token);
      break;
    case Token.PROPERTY:
      store(context, token[1]);
      store(context, colon(context));
      if (propertyValue) {
        value(context, token);
      }
      store(context, needsSemicolon ? semicolon(context, Breaks.AfterProperty, isLast) : emptyCharacter);
      break;
    case Token.RAW:
      store(context, token);
  }
}

function value(context, token) {
  var store = context.store;
  var j, m;

  if (token[2][0] == Token.PROPERTY_BLOCK) {
    store(context, openBrace(context, Breaks.AfterBlockBegins, false));
    body(context, token[2][1]);
    store(context, closeBrace(context, Breaks.AfterBlockEnds, false, true));
  } else {
    for (j = 2, m = token.length; j < m; j++) {
      store(context, token[j]);

      if (j < m - 1 && (inFilter(token) || !disallowsSpace(context, token, j))) {
        store(context, Marker.SPACE);
      }
    }
  }
}

function allowsBreak(context, where) {
  return context.format && context.format.breaks[where];
}

function allowsSpace(context, where) {
  return context.format && context.format.spaces[where];
}

function openBrace(context, where, needsPrefixSpace) {
  if (context.format) {
    context.indentBy += context.format.indentBy;
    context.indentWith = context.format.indentWith.repeat(context.indentBy);
    return (needsPrefixSpace && allowsSpace(context, Spaces.BeforeBlockBegins) ? Marker.SPACE : emptyCharacter) +
      Marker.OPEN_CURLY_BRACKET +
      (allowsBreak(context, where) ? context.format.breakWith : emptyCharacter) +
      context.indentWith;
  } else {
    return Marker.OPEN_CURLY_BRACKET;
  }
}

function closeBrace(context, where, beforeBlockEnd, isLast) {
  if (context.format) {
    context.indentBy -= context.format.indentBy;
    context.indentWith = context.format.indentWith.repeat(context.indentBy);
    return (allowsBreak(context, Breaks.AfterProperty) || beforeBlockEnd && allowsBreak(context, Breaks.BeforeBlockEnds) ? context.format.breakWith : emptyCharacter) +
      context.indentWith +
      Marker.CLOSE_CURLY_BRACKET +
      (isLast ? emptyCharacter : (allowsBreak(context, where) ? context.format.breakWith : emptyCharacter) + context.indentWith);
  } else {
    return Marker.CLOSE_CURLY_BRACKET;
  }
}

function colon(context) {
  return context.format ?
    Marker.COLON + (allowsSpace(context, Spaces.BeforeValue) ? Marker.SPACE : emptyCharacter) :
    Marker.COLON;
}

function semicolon(context, where, isLast) {
  return context.format ?
    Marker.SEMICOLON + (isLast || !allowsBreak(context, where) ? emptyCharacter : context.format.breakWith + context.indentWith) :
    Marker.SEMICOLON;
}

function comma(context) {
  return context.format ?
    Marker.COMMA + (allowsBreak(context, Breaks.BetweenSelectors) ? context.format.breakWith : emptyCharacter) + context.indentWith :
    Marker.COMMA;
}

function all(context, tokens) {
  var store = context.store;
  var token;
  var isLast;
  var i, l;

  for (i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i];
    isLast = i == l - 1;

    switch (token[0]) {
      case Token.AT_RULE:
        store(context, token);
        store(context, semicolon(context, Breaks.AfterAtRule, isLast));
        break;
      case Token.AT_RULE_BLOCK:
        rules(context, token[1]);
        store(context, openBrace(context, Breaks.AfterRuleBegins, true));
        body(context, token[2]);
        store(context, closeBrace(context, Breaks.AfterRuleEnds, false, isLast));
        break;
      case Token.NESTED_BLOCK:
        rules(context, token[1]);
        store(context, openBrace(context, Breaks.AfterBlockBegins, true));
        all(context, token[2]);
        store(context, closeBrace(context, Breaks.AfterBlockEnds, true, isLast));
        break;
      case Token.COMMENT:
        store(context, token);
        store(context, allowsBreak(context, Breaks.AfterComment) ? context.format.breakWith : emptyCharacter);
        break;
      case Token.RAW:
        store(context, token);
        break;
      case Token.RULE:
        rules(context, token[1]);
        store(context, openBrace(context, Breaks.AfterRuleBegins, true));
        body(context, token[2]);
        store(context, closeBrace(context, Breaks.AfterRuleEnds, false, isLast));
        break;
    }
  }
}

module.exports = {
  all: all,
  body: body,
  property: property,
  rules: rules,
  value: value
};
