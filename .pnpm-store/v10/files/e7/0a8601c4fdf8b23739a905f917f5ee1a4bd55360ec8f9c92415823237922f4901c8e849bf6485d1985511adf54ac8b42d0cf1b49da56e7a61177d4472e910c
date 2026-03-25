/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to replace single char group disjunction to char group
 *
 * a|b|c -> [abc]
 * [12]|3|4 -> [1234]
 * (a|b|c) -> ([abc])
 * (?:a|b|c) -> [abc]
 */

module.exports = {
  Disjunction: function Disjunction(path) {
    var node = path.node,
        parent = path.parent;


    if (!handlers[parent.type]) {
      return;
    }

    var charset = new Map();

    if (!shouldProcess(node, charset) || !charset.size) {
      return;
    }

    var characterClass = {
      type: 'CharacterClass',
      expressions: Array.from(charset.keys()).sort().map(function (key) {
        return charset.get(key);
      })
    };

    handlers[parent.type](path.getParent(), characterClass);
  }
};

var handlers = {
  RegExp: function RegExp(path, characterClass) {
    var node = path.node;


    node.body = characterClass;
  },
  Group: function Group(path, characterClass) {
    var node = path.node;


    if (node.capturing) {
      node.expression = characterClass;
    } else {
      path.replace(characterClass);
    }
  }
};

function shouldProcess(expression, charset) {
  if (!expression) {
    // Abort on empty disjunction part
    return false;
  }

  var type = expression.type;


  if (type === 'Disjunction') {
    var left = expression.left,
        right = expression.right;


    return shouldProcess(left, charset) && shouldProcess(right, charset);
  } else if (type === 'Char') {
    if (expression.kind === 'meta' && expression.symbol === '.') {
      return false;
    }

    var value = expression.value;


    charset.set(value, expression);

    return true;
  } else if (type === 'CharacterClass' && !expression.negative) {
    return expression.expressions.every(function (expression) {
      return shouldProcess(expression, charset);
    });
  }

  return false;
}