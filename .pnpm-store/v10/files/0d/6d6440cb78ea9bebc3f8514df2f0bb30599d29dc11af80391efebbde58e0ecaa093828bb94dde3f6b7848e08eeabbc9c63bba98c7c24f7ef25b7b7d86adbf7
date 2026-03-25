/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to translate `/./s` to `/[\0-\uFFFF]/`.
 */

module.exports = {

  // Whether `u` flag present. In which case we transform to
  // \u{10FFFF} instead of \uFFFF.
  _hasUFlag: false,

  // Only run this plugin if we have `s` flag.
  shouldRun: function shouldRun(ast) {
    var shouldRun = ast.flags.includes('s');

    if (!shouldRun) {
      return false;
    }

    // Strip the `s` flag.
    ast.flags = ast.flags.replace('s', '');

    // Whether we have also `u`.
    this._hasUFlag = ast.flags.includes('u');

    return true;
  },
  Char: function Char(path) {
    var node = path.node;


    if (node.kind !== 'meta' || node.value !== '.') {
      return;
    }

    var toValue = '\\uFFFF';
    var toSymbol = '\uFFFF';

    if (this._hasUFlag) {
      toValue = '\\u{10FFFF}';
      toSymbol = '\uDBFF\uDFFF';
    }

    path.replace({
      type: 'CharacterClass',
      expressions: [{
        type: 'ClassRange',
        from: {
          type: 'Char',
          value: '\\0',
          kind: 'decimal',
          symbol: '\0'
        },
        to: {
          type: 'Char',
          value: toValue,
          kind: 'unicode',
          symbol: toSymbol
        }
      }]
    });
  }
};