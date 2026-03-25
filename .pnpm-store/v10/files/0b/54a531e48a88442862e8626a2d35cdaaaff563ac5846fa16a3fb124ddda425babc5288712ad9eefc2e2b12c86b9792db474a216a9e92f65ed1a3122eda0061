/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var NodePath = require('../../traverse/node-path');

var _require = require('../../transform/utils'),
    increaseQuantifierByOne = _require.increaseQuantifierByOne;

/**
 * A regexp-tree plugin to combine repeating patterns.
 *
 * /^abcabcabc/ -> /^abc{3}/
 * /^(?:abc){2}abc/ -> /^(?:abc){3}/
 * /^abc(?:abc){2}/ -> /^(?:abc){3}/
 */

module.exports = {
  Alternative: function Alternative(path) {
    var node = path.node;

    // We can skip the first child

    var index = 1;
    while (index < node.expressions.length) {
      var child = path.getChild(index);
      index = Math.max(1, combineRepeatingPatternLeft(path, child, index));

      if (index >= node.expressions.length) {
        break;
      }

      child = path.getChild(index);
      index = Math.max(1, combineWithPreviousRepetition(path, child, index));

      if (index >= node.expressions.length) {
        break;
      }

      child = path.getChild(index);
      index = Math.max(1, combineRepetitionWithPrevious(path, child, index));

      index++;
    }
  }
};

// abcabc -> (?:abc){2}
function combineRepeatingPatternLeft(alternative, child, index) {
  var node = alternative.node;


  var nbPossibleLengths = Math.ceil(index / 2);
  var i = 0;

  while (i < nbPossibleLengths) {
    var startIndex = index - 2 * i - 1;
    var right = void 0,
        left = void 0;

    if (i === 0) {
      right = child;
      left = alternative.getChild(startIndex);
    } else {
      right = NodePath.getForNode({
        type: 'Alternative',
        expressions: [].concat(_toConsumableArray(node.expressions.slice(index - i, index)), [child.node])
      });

      left = NodePath.getForNode({
        type: 'Alternative',
        expressions: [].concat(_toConsumableArray(node.expressions.slice(startIndex, index - i)))
      });
    }

    if (right.hasEqualSource(left)) {
      for (var j = 0; j < 2 * i + 1; j++) {
        alternative.getChild(startIndex).remove();
      }

      child.replace({
        type: 'Repetition',
        expression: i === 0 && right.node.type !== 'Repetition' ? right.node : {
          type: 'Group',
          capturing: false,
          expression: right.node
        },
        quantifier: {
          type: 'Quantifier',
          kind: 'Range',
          from: 2,
          to: 2,
          greedy: true
        }
      });
      return startIndex;
    }

    i++;
  }

  return index;
}

// (?:abc){2}abc -> (?:abc){3}
function combineWithPreviousRepetition(alternative, child, index) {
  var node = alternative.node;


  var i = 0;
  while (i < index) {
    var previousChild = alternative.getChild(i);

    if (previousChild.node.type === 'Repetition' && previousChild.node.quantifier.greedy) {
      var left = previousChild.getChild();
      var right = void 0;

      if (left.node.type === 'Group' && !left.node.capturing) {
        left = left.getChild();
      }

      if (i + 1 === index) {
        right = child;
        if (right.node.type === 'Group' && !right.node.capturing) {
          right = right.getChild();
        }
      } else {
        right = NodePath.getForNode({
          type: 'Alternative',
          expressions: [].concat(_toConsumableArray(node.expressions.slice(i + 1, index + 1)))
        });
      }

      if (left.hasEqualSource(right)) {
        for (var j = i; j < index; j++) {
          alternative.getChild(i + 1).remove();
        }

        increaseQuantifierByOne(previousChild.node.quantifier);

        return i;
      }
    }

    i++;
  }
  return index;
}

// abc(?:abc){2} -> (?:abc){3}
function combineRepetitionWithPrevious(alternative, child, index) {
  var node = alternative.node;


  if (child.node.type === 'Repetition' && child.node.quantifier.greedy) {
    var right = child.getChild();
    var left = void 0;

    if (right.node.type === 'Group' && !right.node.capturing) {
      right = right.getChild();
    }

    var rightLength = void 0;
    if (right.node.type === 'Alternative') {
      rightLength = right.node.expressions.length;
      left = NodePath.getForNode({
        type: 'Alternative',
        expressions: [].concat(_toConsumableArray(node.expressions.slice(index - rightLength, index)))
      });
    } else {
      rightLength = 1;
      left = alternative.getChild(index - 1);
      if (left.node.type === 'Group' && !left.node.capturing) {
        left = left.getChild();
      }
    }

    if (left.hasEqualSource(right)) {
      for (var j = index - rightLength; j < index; j++) {
        alternative.getChild(index - rightLength).remove();
      }

      increaseQuantifierByOne(child.node.quantifier);

      return index - rightLength;
    }
  }
  return index;
}