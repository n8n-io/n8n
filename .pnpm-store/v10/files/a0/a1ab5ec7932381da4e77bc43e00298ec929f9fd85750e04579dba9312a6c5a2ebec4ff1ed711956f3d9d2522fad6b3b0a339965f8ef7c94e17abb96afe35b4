var Marker = require('../../tokenizer/marker');

var Selector = {
  ADJACENT_SIBLING: '+',
  DESCENDANT: '>',
  DOT: '.',
  HASH: '#',
  NON_ADJACENT_SIBLING: '~',
  PSEUDO: ':'
};

var LETTER_PATTERN = /[a-zA-Z]/;
var NOT_PREFIX = ':not(';
var SEPARATOR_PATTERN = /[\s,\(>~\+]/;

function specificity(selector) {
  var result = [0, 0, 0];
  var character;
  var isEscaped;
  var isSingleQuoted;
  var isDoubleQuoted;
  var roundBracketLevel = 0;
  var couldIntroduceNewTypeSelector;
  var withinNotPseudoClass = false;
  var wasPseudoClass = false;
  var i, l;

  for (i = 0, l = selector.length; i < l; i++) {
    character = selector[i];

    if (isEscaped) {
      // noop
    } else if (character == Marker.SINGLE_QUOTE && !isDoubleQuoted && !isSingleQuoted) {
      isSingleQuoted = true;
    } else if (character == Marker.SINGLE_QUOTE && !isDoubleQuoted && isSingleQuoted) {
      isSingleQuoted = false;
    } else if (character == Marker.DOUBLE_QUOTE && !isDoubleQuoted && !isSingleQuoted) {
      isDoubleQuoted = true;
    } else if (character == Marker.DOUBLE_QUOTE && isDoubleQuoted && !isSingleQuoted) {
      isDoubleQuoted = false;
    } else if (isSingleQuoted || isDoubleQuoted) {
      continue;
    } else if (roundBracketLevel > 0 && !withinNotPseudoClass) {
      // noop
    } else if (character == Marker.OPEN_ROUND_BRACKET) {
      roundBracketLevel++;
    } else if (character == Marker.CLOSE_ROUND_BRACKET && roundBracketLevel == 1) {
      roundBracketLevel--;
      withinNotPseudoClass = false;
    } else if (character == Marker.CLOSE_ROUND_BRACKET) {
      roundBracketLevel--;
    } else if (character == Selector.HASH) {
      result[0]++;
    } else if (character == Selector.DOT || character == Marker.OPEN_SQUARE_BRACKET) {
      result[1]++;
    } else if (character == Selector.PSEUDO && !wasPseudoClass && !isNotPseudoClass(selector, i)) {
      result[1]++;
      withinNotPseudoClass = false;
    } else if (character == Selector.PSEUDO) {
      withinNotPseudoClass = true;
    } else if ((i === 0 || couldIntroduceNewTypeSelector) && LETTER_PATTERN.test(character)) {
      result[2]++;
    }

    isEscaped = character == Marker.BACK_SLASH;
    wasPseudoClass = character == Selector.PSEUDO;
    couldIntroduceNewTypeSelector = !isEscaped && SEPARATOR_PATTERN.test(character);
  }

  return result;
}

function isNotPseudoClass(selector, index) {
  return selector.indexOf(NOT_PREFIX, index) === index;
}

module.exports = specificity;
