/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to remove non-capturing empty groups.
 *
 * /(?:)a/ -> /a/
 * /a|(?:)/ -> /a|/
 */

module.exports = {
  Group: function Group(path) {
    var node = path.node,
        parent = path.parent;

    var childPath = path.getChild();

    if (node.capturing || childPath) {
      return;
    }

    if (parent.type === 'Repetition') {

      path.getParent().replace(node);
    } else if (parent.type !== 'RegExp') {

      path.remove();
    }
  }
};