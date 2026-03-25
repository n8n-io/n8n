var isMergeable = require('./is-mergeable');

var sortSelectors = require('../level-1/sort-selectors');
var tidyRules = require('../level-1/tidy-rules');

var OptimizationLevel = require('../../options/optimization-level').OptimizationLevel;

var serializeBody = require('../../writer/one-time').body;
var serializeRules = require('../../writer/one-time').rules;

var Token = require('../../tokenizer/token');

function unsafeSelector(value) {
  return /\.|\*| :/.test(value);
}

function isBemElement(token) {
  var asString = serializeRules(token[1]);
  return asString.indexOf('__') > -1 || asString.indexOf('--') > -1;
}

function withoutModifier(selector) {
  return selector.replace(/--[^ ,>\+~:]+/g, '');
}

function removeAnyUnsafeElements(left, candidates) {
  var leftSelector = withoutModifier(serializeRules(left[1]));

  for (var body in candidates) {
    var right = candidates[body];
    var rightSelector = withoutModifier(serializeRules(right[1]));

    if (rightSelector.indexOf(leftSelector) > -1 || leftSelector.indexOf(rightSelector) > -1)
      delete candidates[body];
  }
}

function mergeNonAdjacentByBody(tokens, context) {
  var options = context.options;
  var mergeSemantically = options.level[OptimizationLevel.Two].mergeSemantically;
  var adjacentSpace = options.compatibility.selectors.adjacentSpace;
  var selectorsSortingMethod = options.level[OptimizationLevel.One].selectorsSortingMethod;
  var mergeablePseudoClasses = options.compatibility.selectors.mergeablePseudoClasses;
  var mergeablePseudoElements = options.compatibility.selectors.mergeablePseudoElements;
  var multiplePseudoMerging = options.compatibility.selectors.multiplePseudoMerging;
  var candidates = {};

  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];
    if (token[0] != Token.RULE)
      continue;

    if (token[2].length > 0 && (!mergeSemantically && unsafeSelector(serializeRules(token[1]))))
      candidates = {};

    if (token[2].length > 0 && mergeSemantically && isBemElement(token))
      removeAnyUnsafeElements(token, candidates);

    var candidateBody = serializeBody(token[2]);
    var oldToken = candidates[candidateBody];
    if (oldToken &&
        isMergeable(serializeRules(token[1]), mergeablePseudoClasses, mergeablePseudoElements, multiplePseudoMerging) &&
        isMergeable(serializeRules(oldToken[1]), mergeablePseudoClasses, mergeablePseudoElements, multiplePseudoMerging)) {

      if (token[2].length > 0) {
        token[1] = tidyRules(oldToken[1].concat(token[1]), false, adjacentSpace, false, context.warnings);
        token[1] = token[1].length > 1 ? sortSelectors(token[1], selectorsSortingMethod) : token[1];
      } else {
        token[1] = oldToken[1].concat(token[1]);
      }

      oldToken[2] = [];
      candidates[candidateBody] = null;
    }

    candidates[serializeBody(token[2])] = token;
  }
}

module.exports = mergeNonAdjacentByBody;
