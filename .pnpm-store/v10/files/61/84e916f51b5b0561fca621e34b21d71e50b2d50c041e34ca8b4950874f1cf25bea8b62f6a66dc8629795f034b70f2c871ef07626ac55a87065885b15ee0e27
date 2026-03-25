var Spaces = require('../../options/format').Spaces;
var Marker = require('../../tokenizer/marker');
var formatPosition = require('../../utils/format-position');

var CASE_ATTRIBUTE_PATTERN = /[\s"'][iI]\s*\]/;
var CASE_RESTORE_PATTERN = /([\d\w])([iI])\]/g;
var DOUBLE_QUOTE_CASE_PATTERN = /="([a-zA-Z][a-zA-Z\d\-_]+)"([iI])/g;
var DOUBLE_QUOTE_PATTERN = /="([a-zA-Z][a-zA-Z\d\-_]+)"(\s|\])/g;
var HTML_COMMENT_PATTERN = /^(?:(?:<!--|-->)\s*)+/;
var SINGLE_QUOTE_CASE_PATTERN = /='([a-zA-Z][a-zA-Z\d\-_]+)'([iI])/g;
var SINGLE_QUOTE_PATTERN = /='([a-zA-Z][a-zA-Z\d\-_]+)'(\s|\])/g;
var RELATION_PATTERN = /[>\+~]/;
var WHITESPACE_PATTERN = /\s/;

var ASTERISK_PLUS_HTML_HACK = '*+html ';
var ASTERISK_FIRST_CHILD_PLUS_HTML_HACK = '*:first-child+html ';
var LESS_THAN = '<';

function hasInvalidCharacters(value) {
  var isEscaped;
  var isInvalid = false;
  var character;
  var isQuote = false;
  var i, l;

  for (i = 0, l = value.length; i < l; i++) {
    character = value[i];

    if (isEscaped) {
      // continue as always
    } else if (character == Marker.SINGLE_QUOTE || character == Marker.DOUBLE_QUOTE) {
      isQuote = !isQuote;
    } else if (!isQuote && (character == Marker.CLOSE_CURLY_BRACKET || character == Marker.EXCLAMATION || character == LESS_THAN || character == Marker.SEMICOLON)) {
      isInvalid = true;
      break;
    } else if (!isQuote && i === 0 && RELATION_PATTERN.test(character)) {
      isInvalid = true;
      break;
    }

    isEscaped = character == Marker.BACK_SLASH;
  }

  return isInvalid;
}

function removeWhitespace(value, format) {
  var stripped = [];
  var character;
  var isNewLineNix;
  var isNewLineWin;
  var isEscaped;
  var wasEscaped;
  var isQuoted;
  var isSingleQuoted;
  var isDoubleQuoted;
  var isAttribute;
  var isRelation;
  var isWhitespace;
  var roundBracketLevel = 0;
  var wasRelation = false;
  var wasWhitespace = false;
  var withCaseAttribute = CASE_ATTRIBUTE_PATTERN.test(value);
  var spaceAroundRelation = format && format.spaces[Spaces.AroundSelectorRelation];
  var i, l;

  for (i = 0, l = value.length; i < l; i++) {
    character = value[i];

    isNewLineNix = character == Marker.NEW_LINE_NIX;
    isNewLineWin = character == Marker.NEW_LINE_NIX && value[i - 1] == Marker.CARRIAGE_RETURN;
    isQuoted = isSingleQuoted || isDoubleQuoted;
    isRelation = !isAttribute && !isEscaped && roundBracketLevel === 0 && RELATION_PATTERN.test(character);
    isWhitespace = WHITESPACE_PATTERN.test(character);

    if (wasEscaped && isQuoted && isNewLineWin) {
      // swallow escaped new windows lines in comments
      stripped.pop();
      stripped.pop();
    } else if (isEscaped && isQuoted && isNewLineNix) {
      // swallow escaped new *nix lines in comments
      stripped.pop();
    } else if (isEscaped) {
      stripped.push(character);
    } else if (character == Marker.OPEN_SQUARE_BRACKET && !isQuoted) {
      stripped.push(character);
      isAttribute = true;
    } else if (character == Marker.CLOSE_SQUARE_BRACKET && !isQuoted) {
      stripped.push(character);
      isAttribute = false;
    } else if (character == Marker.OPEN_ROUND_BRACKET && !isQuoted) {
      stripped.push(character);
      roundBracketLevel++;
    } else if (character == Marker.CLOSE_ROUND_BRACKET && !isQuoted) {
      stripped.push(character);
      roundBracketLevel--;
    } else if (character == Marker.SINGLE_QUOTE && !isQuoted) {
      stripped.push(character);
      isSingleQuoted = true;
    } else if (character == Marker.DOUBLE_QUOTE && !isQuoted) {
      stripped.push(character);
      isDoubleQuoted = true;
    } else if (character == Marker.SINGLE_QUOTE && isQuoted) {
      stripped.push(character);
      isSingleQuoted = false;
    } else if (character == Marker.DOUBLE_QUOTE && isQuoted) {
      stripped.push(character);
      isDoubleQuoted = false;
    } else if (isWhitespace && wasRelation && !spaceAroundRelation) {
      continue;
    } else if (!isWhitespace && wasRelation && spaceAroundRelation) {
      stripped.push(Marker.SPACE);
      stripped.push(character);
    } else if (isWhitespace && (isAttribute || roundBracketLevel > 0) && !isQuoted) {
      // skip space
    } else if (isWhitespace && wasWhitespace && !isQuoted) {
      // skip extra space
    } else if ((isNewLineWin || isNewLineNix) && (isAttribute || roundBracketLevel > 0) && isQuoted) {
      // skip newline
    } else if (isRelation && wasWhitespace && !spaceAroundRelation) {
      stripped.pop();
      stripped.push(character);
    } else if (isRelation && !wasWhitespace && spaceAroundRelation) {
      stripped.push(Marker.SPACE);
      stripped.push(character);
    } else if (isWhitespace) {
      stripped.push(Marker.SPACE);
    } else {
      stripped.push(character);
    }

    wasEscaped = isEscaped;
    isEscaped = character == Marker.BACK_SLASH;
    wasRelation = isRelation;
    wasWhitespace = isWhitespace;
  }

  return withCaseAttribute ?
    stripped.join('').replace(CASE_RESTORE_PATTERN, '$1 $2]') :
    stripped.join('');
}

function removeQuotes(value) {
  if (value.indexOf('\'') == -1 && value.indexOf('"') == -1) {
    return value;
  }

  return value
    .replace(SINGLE_QUOTE_CASE_PATTERN, '=$1 $2')
    .replace(SINGLE_QUOTE_PATTERN, '=$1$2')
    .replace(DOUBLE_QUOTE_CASE_PATTERN, '=$1 $2')
    .replace(DOUBLE_QUOTE_PATTERN, '=$1$2');
}

function tidyRules(rules, removeUnsupported, adjacentSpace, format, warnings) {
  var list = [];
  var repeated = [];

  function removeHTMLComment(rule, match) {
    warnings.push('HTML comment \'' + match + '\' at ' + formatPosition(rule[2][0]) + '. Removing.');
    return '';
  }

  for (var i = 0, l = rules.length; i < l; i++) {
    var rule = rules[i];
    var reduced = rule[1];

    reduced = reduced.replace(HTML_COMMENT_PATTERN, removeHTMLComment.bind(null, rule));

    if (hasInvalidCharacters(reduced)) {
      warnings.push('Invalid selector \'' + rule[1] + '\' at ' + formatPosition(rule[2][0]) + '. Ignoring.');
      continue;
    }

    reduced = removeWhitespace(reduced, format);
    reduced = removeQuotes(reduced);

    if (adjacentSpace && reduced.indexOf('nav') > 0) {
      reduced = reduced.replace(/\+nav(\S|$)/, '+ nav$1');
    }

    if (removeUnsupported && reduced.indexOf(ASTERISK_PLUS_HTML_HACK) > -1) {
      continue;
    }

    if (removeUnsupported && reduced.indexOf(ASTERISK_FIRST_CHILD_PLUS_HTML_HACK) > -1) {
      continue;
    }

    if (reduced.indexOf('*') > -1) {
      reduced = reduced
        .replace(/\*([:#\.\[])/g, '$1')
        .replace(/^(\:first\-child)?\+html/, '*$1+html');
    }

    if (repeated.indexOf(reduced) > -1) {
      continue;
    }

    rule[1] = reduced;
    repeated.push(reduced);
    list.push(rule);
  }

  if (list.length == 1 && list[0][1].length === 0) {
    warnings.push('Empty selector \'' + list[0][1] + '\' at ' + formatPosition(list[0][2][0]) + '. Ignoring.');
    list = [];
  }

  return list;
}

module.exports = tidyRules;
