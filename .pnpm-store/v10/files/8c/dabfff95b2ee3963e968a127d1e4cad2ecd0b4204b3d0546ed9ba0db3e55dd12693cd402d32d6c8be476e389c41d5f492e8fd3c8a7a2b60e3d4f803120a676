/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to merge class ranges.
 *
 * [a-ec] -> [a-e]
 * [a-ec-e] -> [a-e]
 * [\w\da-f] -> [\w]
 * [abcdef] -> [a-f]
 */

module.exports = {
  _hasIUFlags: false,
  init: function init(ast) {
    this._hasIUFlags = ast.flags.includes('i') && ast.flags.includes('u');
  },
  CharacterClass: function CharacterClass(path) {
    var node = path.node;

    var expressions = node.expressions;

    var metas = [];
    // Extract metas
    expressions.forEach(function (expression) {
      if (isMeta(expression)) {
        metas.push(expression.value);
      }
    });

    expressions.sort(sortCharClass);

    for (var i = 0; i < expressions.length; i++) {
      var expression = expressions[i];
      if (fitsInMetas(expression, metas, this._hasIUFlags) || combinesWithPrecedingClassRange(expression, expressions[i - 1]) || combinesWithFollowingClassRange(expression, expressions[i + 1])) {
        expressions.splice(i, 1);
        i--;
      } else {
        var nbMergedChars = charCombinesWithPrecedingChars(expression, i, expressions);
        expressions.splice(i - nbMergedChars + 1, nbMergedChars);
        i -= nbMergedChars;
      }
    }
  }
};

/**
 * Sorts expressions in char class in the following order:
 * - meta chars, ordered alphabetically by value
 * - chars (except `control` kind) and class ranges, ordered alphabetically (`from` char is used for class ranges)
 * - if ambiguous, class range comes before char
 * - if ambiguous between two class ranges, orders alphabetically by `to` char
 * - control chars, ordered alphabetically by value
 * @param {Object} a - Left Char or ClassRange node
 * @param {Object} b - Right Char or ClassRange node
 * @returns {number}
 */
function sortCharClass(a, b) {
  var aValue = getSortValue(a);
  var bValue = getSortValue(b);

  if (aValue === bValue) {
    // We want ClassRange before Char
    // [bb-d] -> [b-db]
    if (a.type === 'ClassRange' && b.type !== 'ClassRange') {
      return -1;
    }
    if (b.type === 'ClassRange' && a.type !== 'ClassRange') {
      return 1;
    }
    if (a.type === 'ClassRange' && b.type === 'ClassRange') {
      return getSortValue(a.to) - getSortValue(b.to);
    }
    if (isMeta(a) && isMeta(b) || isControl(a) && isControl(b)) {
      return a.value < b.value ? -1 : 1;
    }
  }
  return aValue - bValue;
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @returns {number}
 */
function getSortValue(expression) {
  if (expression.type === 'Char') {
    if (expression.value === '-') {
      return Infinity;
    }
    if (expression.kind === 'control') {
      return Infinity;
    }
    if (expression.kind === 'meta' && isNaN(expression.codePoint)) {
      return -1;
    }
    return expression.codePoint;
  }
  // ClassRange
  return expression.from.codePoint;
}

/**
 * Checks if a node is a meta char from the set \d\w\s\D\W\S
 * @param {Object} expression - Char or ClassRange node
 * @param {?string} value
 * @returns {boolean}
 */
function isMeta(expression) {
  var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  return expression.type === 'Char' && expression.kind === 'meta' && (value ? expression.value === value : /^\\[dws]$/i.test(expression.value));
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @returns {boolean}
 */
function isControl(expression) {
  return expression.type === 'Char' && expression.kind === 'control';
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @param {string[]} metas - Array of meta chars, e.g. ["\\w", "\\s"]
 * @param {boolean} hasIUFlags
 * @returns {boolean}
 */
function fitsInMetas(expression, metas, hasIUFlags) {
  for (var i = 0; i < metas.length; i++) {
    if (fitsInMeta(expression, metas[i], hasIUFlags)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @param {string} meta - e.g. "\\w"
 * @param {boolean} hasIUFlags
 * @returns {boolean}
 */
function fitsInMeta(expression, meta, hasIUFlags) {
  if (expression.type === 'ClassRange') {
    return fitsInMeta(expression.from, meta, hasIUFlags) && fitsInMeta(expression.to, meta, hasIUFlags);
  }

  // Special cases:
  // \S contains \w and \d
  if (meta === '\\S' && (isMeta(expression, '\\w') || isMeta(expression, '\\d'))) {
    return true;
  }
  // \D contains \W and \s
  if (meta === '\\D' && (isMeta(expression, '\\W') || isMeta(expression, '\\s'))) {
    return true;
  }
  // \w contains \d
  if (meta === '\\w' && isMeta(expression, '\\d')) {
    return true;
  }
  // \W contains \s
  if (meta === '\\W' && isMeta(expression, '\\s')) {
    return true;
  }

  if (expression.type !== 'Char' || isNaN(expression.codePoint)) {
    return false;
  }

  if (meta === '\\s') {
    return fitsInMetaS(expression);
  }
  if (meta === '\\S') {
    return !fitsInMetaS(expression);
  }
  if (meta === '\\d') {
    return fitsInMetaD(expression);
  }
  if (meta === '\\D') {
    return !fitsInMetaD(expression);
  }
  if (meta === '\\w') {
    return fitsInMetaW(expression, hasIUFlags);
  }
  if (meta === '\\W') {
    return !fitsInMetaW(expression, hasIUFlags);
  }
  return false;
}

/**
 * @param {Object} expression - Char node with codePoint
 * @returns {boolean}
 */
function fitsInMetaS(expression) {
  return expression.codePoint === 0x0009 || // \t
  expression.codePoint === 0x000a || // \n
  expression.codePoint === 0x000b || // \v
  expression.codePoint === 0x000c || // \f
  expression.codePoint === 0x000d || // \r
  expression.codePoint === 0x0020 || // space
  expression.codePoint === 0x00a0 || // nbsp
  expression.codePoint === 0x1680 || // part of Zs
  expression.codePoint >= 0x2000 && expression.codePoint <= 0x200a || // part of Zs
  expression.codePoint === 0x2028 || // line separator
  expression.codePoint === 0x2029 || // paragraph separator
  expression.codePoint === 0x202f || // part of Zs
  expression.codePoint === 0x205f || // part of Zs
  expression.codePoint === 0x3000 || // part of Zs
  expression.codePoint === 0xfeff; // zwnbsp
}

/**
 * @param {Object} expression - Char node with codePoint
 * @returns {boolean}
 */
function fitsInMetaD(expression) {
  return expression.codePoint >= 0x30 && expression.codePoint <= 0x39; // 0-9
}

/**
 * @param {Object} expression - Char node with codePoint
 * @param {boolean} hasIUFlags
 * @returns {boolean}
 */
function fitsInMetaW(expression, hasIUFlags) {
  return fitsInMetaD(expression) || expression.codePoint >= 0x41 && expression.codePoint <= 0x5a || // A-Z
  expression.codePoint >= 0x61 && expression.codePoint <= 0x7a || // a-z
  expression.value === '_' || hasIUFlags && (expression.codePoint === 0x017f || expression.codePoint === 0x212a);
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @param {Object} classRange - Char or ClassRange node
 * @returns {boolean}
 */
function combinesWithPrecedingClassRange(expression, classRange) {
  if (classRange && classRange.type === 'ClassRange') {
    if (fitsInClassRange(expression, classRange)) {
      // [a-gc] -> [a-g]
      // [a-gc-e] -> [a-g]
      return true;
    } else if (
    // We only want \w chars or char codes to keep readability
    isMetaWCharOrCode(expression) && classRange.to.codePoint === expression.codePoint - 1) {
      // [a-de] -> [a-e]
      classRange.to = expression;
      return true;
    } else if (expression.type === 'ClassRange' && expression.from.codePoint <= classRange.to.codePoint + 1 && expression.to.codePoint >= classRange.from.codePoint - 1) {
      // [a-db-f] -> [a-f]
      // [b-fa-d] -> [a-f]
      // [a-cd-f] -> [a-f]
      if (expression.from.codePoint < classRange.from.codePoint) {
        classRange.from = expression.from;
      }
      if (expression.to.codePoint > classRange.to.codePoint) {
        classRange.to = expression.to;
      }
      return true;
    }
  }
  return false;
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @param {Object} classRange - Char or ClassRange node
 * @returns {boolean}
 */
function combinesWithFollowingClassRange(expression, classRange) {
  if (classRange && classRange.type === 'ClassRange') {
    // Considering the elements were ordered alphabetically,
    // there is only one case to handle
    // [ab-e] -> [a-e]
    if (
    // We only want \w chars or char codes to keep readability
    isMetaWCharOrCode(expression) && classRange.from.codePoint === expression.codePoint + 1) {
      classRange.from = expression;
      return true;
    }
  }

  return false;
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @param {Object} classRange - ClassRange node
 * @returns {boolean}
 */
function fitsInClassRange(expression, classRange) {
  if (expression.type === 'Char' && isNaN(expression.codePoint)) {
    return false;
  }
  if (expression.type === 'ClassRange') {
    return fitsInClassRange(expression.from, classRange) && fitsInClassRange(expression.to, classRange);
  }
  return expression.codePoint >= classRange.from.codePoint && expression.codePoint <= classRange.to.codePoint;
}

/**
 * @param {Object} expression - Char or ClassRange node
 * @param {Number} index
 * @param {Object[]} expressions - expressions in CharClass
 * @returns {number} - Number of characters combined with expression
 */
function charCombinesWithPrecedingChars(expression, index, expressions) {
  // We only want \w chars or char codes to keep readability
  if (!isMetaWCharOrCode(expression)) {
    return 0;
  }
  var nbMergedChars = 0;
  while (index > 0) {
    var currentExpression = expressions[index];
    var precedingExpresion = expressions[index - 1];
    if (isMetaWCharOrCode(precedingExpresion) && precedingExpresion.codePoint === currentExpression.codePoint - 1) {
      nbMergedChars++;
      index--;
    } else {
      break;
    }
  }

  if (nbMergedChars > 1) {
    expressions[index] = {
      type: 'ClassRange',
      from: expressions[index],
      to: expression
    };
    return nbMergedChars;
  }
  return 0;
}

function isMetaWCharOrCode(expression) {
  return expression && expression.type === 'Char' && !isNaN(expression.codePoint) && (fitsInMetaW(expression, false) || expression.kind === 'unicode' || expression.kind === 'hex' || expression.kind === 'oct' || expression.kind === 'decimal');
}