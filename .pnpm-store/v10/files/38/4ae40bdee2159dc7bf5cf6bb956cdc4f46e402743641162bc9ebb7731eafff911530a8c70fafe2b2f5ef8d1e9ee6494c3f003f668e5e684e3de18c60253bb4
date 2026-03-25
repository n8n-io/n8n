/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to remove duplicates from character classes.
 */

module.exports = {
  CharacterClass: function CharacterClass(path) {
    var node = path.node;

    var sources = {};

    for (var i = 0; i < node.expressions.length; i++) {
      var childPath = path.getChild(i);
      var source = childPath.jsonEncode();

      if (sources.hasOwnProperty(source)) {
        childPath.remove();

        // Since we remove the current node.
        // TODO: make it simpler for users with a method.
        i--;
      }

      sources[source] = true;
    }
  }
};