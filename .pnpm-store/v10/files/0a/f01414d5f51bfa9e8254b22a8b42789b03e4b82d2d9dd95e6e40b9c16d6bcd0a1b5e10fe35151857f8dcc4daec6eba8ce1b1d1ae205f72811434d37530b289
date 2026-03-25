var isMergeable = require('./is-mergeable');

var optimizeProperties = require('./properties/optimize');

var cloneArray = require('../../utils/clone-array');

var Token = require('../../tokenizer/token');

var serializeBody = require('../../writer/one-time').body;
var serializeRules = require('../../writer/one-time').rules;

function reduceNonAdjacent(tokens, context) {
  var options = context.options;
  var mergeablePseudoClasses = options.compatibility.selectors.mergeablePseudoClasses;
  var mergeablePseudoElements = options.compatibility.selectors.mergeablePseudoElements;
  var multiplePseudoMerging = options.compatibility.selectors.multiplePseudoMerging;
  var candidates = {};
  var repeated = [];

  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];

    if (token[0] != Token.RULE) {
      continue;
    } else if (token[2].length === 0) {
      continue;
    }

    var selectorAsString = serializeRules(token[1]);
    var isComplexAndNotSpecial = token[1].length > 1 &&
      isMergeable(selectorAsString, mergeablePseudoClasses, mergeablePseudoElements, multiplePseudoMerging);
    var wrappedSelectors = wrappedSelectorsFrom(token[1]);
    var selectors = isComplexAndNotSpecial ?
      [selectorAsString].concat(wrappedSelectors) :
      [selectorAsString];

    for (var j = 0, m = selectors.length; j < m; j++) {
      var selector = selectors[j];

      if (!candidates[selector])
        candidates[selector] = [];
      else
        repeated.push(selector);

      candidates[selector].push({
        where: i,
        list: wrappedSelectors,
        isPartial: isComplexAndNotSpecial && j > 0,
        isComplex: isComplexAndNotSpecial && j === 0
      });
    }
  }

  reduceSimpleNonAdjacentCases(tokens, repeated, candidates, options, context);
  reduceComplexNonAdjacentCases(tokens, candidates, options, context);
}

function wrappedSelectorsFrom(list) {
  var wrapped = [];

  for (var i = 0; i < list.length; i++) {
    wrapped.push([list[i][1]]);
  }

  return wrapped;
}

function reduceSimpleNonAdjacentCases(tokens, repeated, candidates, options, context) {
  function filterOut(idx, bodies) {
    return data[idx].isPartial && bodies.length === 0;
  }

  function reduceBody(token, newBody, processedCount, tokenIdx) {
    if (!data[processedCount - tokenIdx - 1].isPartial)
      token[2] = newBody;
  }

  for (var i = 0, l = repeated.length; i < l; i++) {
    var selector = repeated[i];
    var data = candidates[selector];

    reduceSelector(tokens, data, {
      filterOut: filterOut,
      callback: reduceBody
    }, options, context);
  }
}

function reduceComplexNonAdjacentCases(tokens, candidates, options, context) {
  var mergeablePseudoClasses = options.compatibility.selectors.mergeablePseudoClasses;
  var mergeablePseudoElements = options.compatibility.selectors.mergeablePseudoElements;
  var multiplePseudoMerging = options.compatibility.selectors.multiplePseudoMerging;
  var localContext = {};

  function filterOut(idx) {
    return localContext.data[idx].where < localContext.intoPosition;
  }

  function collectReducedBodies(token, newBody, processedCount, tokenIdx) {
    if (tokenIdx === 0)
      localContext.reducedBodies.push(newBody);
  }

  allSelectors:
  for (var complexSelector in candidates) {
    var into = candidates[complexSelector];
    if (!into[0].isComplex)
      continue;

    var intoPosition = into[into.length - 1].where;
    var intoToken = tokens[intoPosition];
    var reducedBodies = [];

    var selectors = isMergeable(complexSelector, mergeablePseudoClasses, mergeablePseudoElements, multiplePseudoMerging) ?
      into[0].list :
      [complexSelector];

    localContext.intoPosition = intoPosition;
    localContext.reducedBodies = reducedBodies;

    for (var j = 0, m = selectors.length; j < m; j++) {
      var selector = selectors[j];
      var data = candidates[selector];

      if (data.length < 2)
        continue allSelectors;

      localContext.data = data;

      reduceSelector(tokens, data, {
        filterOut: filterOut,
        callback: collectReducedBodies
      }, options, context);

      if (serializeBody(reducedBodies[reducedBodies.length - 1]) != serializeBody(reducedBodies[0]))
        continue allSelectors;
    }

    intoToken[2] = reducedBodies[0];
  }
}

function reduceSelector(tokens, data, context, options, outerContext) {
  var bodies = [];
  var bodiesAsList = [];
  var processedTokens = [];

  for (var j = data.length - 1; j >= 0; j--) {
    if (context.filterOut(j, bodies))
      continue;

    var where = data[j].where;
    var token = tokens[where];
    var clonedBody = cloneArray(token[2]);

    bodies = bodies.concat(clonedBody);
    bodiesAsList.push(clonedBody);
    processedTokens.push(where);
  }

  optimizeProperties(bodies, true, false, outerContext);

  var processedCount = processedTokens.length;
  var propertyIdx = bodies.length - 1;
  var tokenIdx = processedCount - 1;

  while (tokenIdx >= 0) {
     if ((tokenIdx === 0 || (bodies[propertyIdx] && bodiesAsList[tokenIdx].indexOf(bodies[propertyIdx]) > -1)) && propertyIdx > -1) {
      propertyIdx--;
      continue;
    }

    var newBody = bodies.splice(propertyIdx + 1);
    context.callback(tokens[processedTokens[tokenIdx]], newBody, processedCount, tokenIdx);

    tokenIdx--;
  }
}

module.exports = reduceNonAdjacent;
