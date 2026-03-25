/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to transform surrogate pairs into single unicode code point
 *
 * \ud83d\ude80 -> \u{1f680}
 */

module.exports = {
  shouldRun: function shouldRun(ast) {
    return ast.flags.includes('u');
  },
  Char: function Char(path) {
    var node = path.node;

    if (node.kind !== 'unicode' || !node.isSurrogatePair || isNaN(node.codePoint)) {
      return;
    }
    node.value = '\\u{' + node.codePoint.toString(16) + '}';
    delete node.isSurrogatePair;
  }
};