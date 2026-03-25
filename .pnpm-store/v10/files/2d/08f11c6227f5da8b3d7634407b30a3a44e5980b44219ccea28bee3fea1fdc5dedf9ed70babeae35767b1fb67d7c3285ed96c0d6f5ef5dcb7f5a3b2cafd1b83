/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to simplify character classes
 * spanning only one or two chars.
 *
 * [a-a] -> [a]
 * [a-b] -> [ab]
 */

module.exports = {
  ClassRange: function ClassRange(path) {
    var node = path.node;


    if (node.from.codePoint === node.to.codePoint) {

      path.replace(node.from);
    } else if (node.from.codePoint === node.to.codePoint - 1) {

      path.getParent().insertChildAt(node.to, path.index + 1);
      path.replace(node.from);
    }
  }
};