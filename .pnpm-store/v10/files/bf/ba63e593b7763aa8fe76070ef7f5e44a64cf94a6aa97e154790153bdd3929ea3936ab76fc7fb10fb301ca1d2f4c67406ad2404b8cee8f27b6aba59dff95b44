/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to remove unnecessary groups.
 *
 * /(?:a)/ -> /a/
 */

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

module.exports = {
  Group: function Group(path) {
    var node = path.node,
        parent = path.parent;

    var childPath = path.getChild();

    if (node.capturing || !childPath) {
      return;
    }

    // Don't optimize \1(?:0) to \10
    if (!hasAppropriateSiblings(path)) {
      return;
    }

    // Don't optimize /a(?:b|c)/ to /ab|c/
    // but /(?:b|c)/ to /b|c/ is ok
    if (childPath.node.type === 'Disjunction' && parent.type !== 'RegExp') {
      return;
    }

    // Don't optimize /(?:ab)+/ to /ab+/
    // but /(?:a)+/ to /a+/ is ok
    // and /(?:[a-d])+/ to /[a-d]+/ is ok too
    if (parent.type === 'Repetition' && childPath.node.type !== 'Char' && childPath.node.type !== 'CharacterClass') {
      return;
    }

    if (childPath.node.type === 'Alternative') {
      var parentPath = path.getParent();
      if (parentPath.node.type === 'Alternative') {
        // /abc(?:def)ghi/ When (?:def) is ungrouped its content must be merged with parent alternative

        parentPath.replace({
          type: 'Alternative',
          expressions: [].concat(_toConsumableArray(parent.expressions.slice(0, path.index)), _toConsumableArray(childPath.node.expressions), _toConsumableArray(parent.expressions.slice(path.index + 1)))
        });
      }
    } else {
      path.replace(childPath.node);
    }
  }
};

function hasAppropriateSiblings(path) {
  var parent = path.parent,
      index = path.index;


  if (parent.type !== 'Alternative') {
    return true;
  }

  var previousNode = parent.expressions[index - 1];
  if (previousNode == null) {
    return true;
  }

  // Don't optimized \1(?:0) to \10
  if (previousNode.type === 'Backreference' && previousNode.kind === 'number') {
    return false;
  }

  // Don't optimized \2(?:0) to \20
  if (previousNode.type === 'Char' && previousNode.kind === 'decimal') {
    return false;
  }

  return true;
}