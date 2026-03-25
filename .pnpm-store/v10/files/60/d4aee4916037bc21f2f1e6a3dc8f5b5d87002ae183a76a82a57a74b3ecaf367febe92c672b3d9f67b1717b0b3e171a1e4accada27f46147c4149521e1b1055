/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var UPPER_A_CP = 'A'.codePointAt(0);
var UPPER_Z_CP = 'Z'.codePointAt(0);
var LOWER_A_CP = 'a'.codePointAt(0);
var LOWER_Z_CP = 'z'.codePointAt(0);
var DIGIT_0_CP = '0'.codePointAt(0);
var DIGIT_9_CP = '9'.codePointAt(0);

/**
 * A regexp-tree plugin to transform coded chars into simple chars.
 *
 * \u0061 -> a
 */
module.exports = {
  Char: function Char(path) {
    var node = path.node,
        parent = path.parent;

    if (isNaN(node.codePoint) || node.kind === 'simple') {
      return;
    }

    if (parent.type === 'ClassRange') {
      if (!isSimpleRange(parent)) {
        return;
      }
    }

    if (!isPrintableASCIIChar(node.codePoint)) {
      return;
    }

    var symbol = String.fromCodePoint(node.codePoint);
    var newChar = {
      type: 'Char',
      kind: 'simple',
      value: symbol,
      symbol: symbol,
      codePoint: node.codePoint
    };
    if (needsEscape(symbol, parent.type)) {
      newChar.escaped = true;
    }
    path.replace(newChar);
  }
};

/**
 * Checks if a range is included either in 0-9, a-z or A-Z
 * @param classRange
 * @returns {boolean}
 */
function isSimpleRange(classRange) {
  var from = classRange.from,
      to = classRange.to;

  return from.codePoint >= DIGIT_0_CP && from.codePoint <= DIGIT_9_CP && to.codePoint >= DIGIT_0_CP && to.codePoint <= DIGIT_9_CP || from.codePoint >= UPPER_A_CP && from.codePoint <= UPPER_Z_CP && to.codePoint >= UPPER_A_CP && to.codePoint <= UPPER_Z_CP || from.codePoint >= LOWER_A_CP && from.codePoint <= LOWER_Z_CP && to.codePoint >= LOWER_A_CP && to.codePoint <= LOWER_Z_CP;
}

/**
 * Checks if a code point in the range of printable ASCII chars
 * (DEL char excluded)
 * @param codePoint
 * @returns {boolean}
 */
function isPrintableASCIIChar(codePoint) {
  return codePoint >= 0x20 && codePoint <= 0x7e;
}

function needsEscape(symbol, parentType) {
  if (parentType === 'ClassRange' || parentType === 'CharacterClass') {
    return (/[\]\\^-]/.test(symbol)
    );
  }

  return (/[*[()+?^$./\\|{}]/.test(symbol)
  );
}