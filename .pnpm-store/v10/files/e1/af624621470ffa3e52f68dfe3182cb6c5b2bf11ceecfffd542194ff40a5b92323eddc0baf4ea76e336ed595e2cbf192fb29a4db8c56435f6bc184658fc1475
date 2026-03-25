/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to replace different range-based quantifiers
 * with their symbol equivalents.
 *
 * a{0,} -> a*
 * a{1,} -> a+
 * a{1} -> a
 *
 * NOTE: the following is automatically handled in the generator:
 *
 * a{3,3} -> a{3}
 */

module.exports = {
  Quantifier: function Quantifier(path) {
    var node = path.node;


    if (node.kind !== 'Range') {
      return;
    }

    // a{0,} -> a*
    rewriteOpenZero(path);

    // a{1,} -> a+
    rewriteOpenOne(path);

    // a{1} -> a
    rewriteExactOne(path);
  }
};

function rewriteOpenZero(path) {
  var node = path.node;


  if (node.from !== 0 || node.to) {
    return;
  }

  node.kind = '*';
  delete node.from;
}

function rewriteOpenOne(path) {
  var node = path.node;


  if (node.from !== 1 || node.to) {
    return;
  }

  node.kind = '+';
  delete node.from;
}

function rewriteExactOne(path) {
  var node = path.node;


  if (node.from !== 1 || node.to !== 1) {
    return;
  }

  path.parentPath.replace(path.parentPath.node.expression);
}