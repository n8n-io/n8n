/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * Flattens a nested disjunction node to a list.
 *
 * /a|b|c|d/
 *
 * {{{a, b}, c}, d} -> [a, b, c, d]
 */

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function disjunctionToList(node) {
  if (node.type !== 'Disjunction') {
    throw new TypeError('Expected "Disjunction" node, got "' + node.type + '"');
  }

  var list = [];

  if (node.left && node.left.type === 'Disjunction') {
    list.push.apply(list, _toConsumableArray(disjunctionToList(node.left)).concat([node.right]));
  } else {
    list.push(node.left, node.right);
  }

  return list;
}

/**
 * Builds a nested disjunction node from a list.
 *
 * /a|b|c|d/
 *
 * [a, b, c, d] -> {{{a, b}, c}, d}
 */
function listToDisjunction(list) {
  return list.reduce(function (left, right) {
    return {
      type: 'Disjunction',
      left: left,
      right: right
    };
  });
}

/**
 * Increases a quantifier by one.
 * Does not change greediness.
 * * -> +
 * + -> {2,}
 * ? -> {1,2}
 * {2} -> {3}
 * {2,} -> {3,}
 * {2,3} -> {3,4}
 */
function increaseQuantifierByOne(quantifier) {
  if (quantifier.kind === '*') {

    quantifier.kind = '+';
  } else if (quantifier.kind === '+') {

    quantifier.kind = 'Range';
    quantifier.from = 2;
    delete quantifier.to;
  } else if (quantifier.kind === '?') {

    quantifier.kind = 'Range';
    quantifier.from = 1;
    quantifier.to = 2;
  } else if (quantifier.kind === 'Range') {

    quantifier.from += 1;
    if (quantifier.to) {
      quantifier.to += 1;
    }
  }
}

module.exports = {
  disjunctionToList: disjunctionToList,
  listToDisjunction: listToDisjunction,
  increaseQuantifierByOne: increaseQuantifierByOne
};