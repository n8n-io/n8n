var canReorder = require('./reorderable').canReorder;
var extractProperties = require('./extract-properties');

var optimizeProperties = require('./properties/optimize');

var serializeRules = require('../../writer/one-time').rules;

var Token = require('../../tokenizer/token');

function mergeNonAdjacentBySelector(tokens, context) {
  var specificityCache = context.cache.specificity;
  var allSelectors = {};
  var repeatedSelectors = [];
  var i;

  for (i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i][0] != Token.RULE)
      continue;
    if (tokens[i][2].length === 0)
      continue;

    var selector = serializeRules(tokens[i][1]);
    allSelectors[selector] = [i].concat(allSelectors[selector] || []);

    if (allSelectors[selector].length == 2)
      repeatedSelectors.push(selector);
  }

  for (i = repeatedSelectors.length - 1; i >= 0; i--) {
    var positions = allSelectors[repeatedSelectors[i]];

    selectorIterator:
    for (var j = positions.length - 1; j > 0; j--) {
      var positionOne = positions[j - 1];
      var tokenOne = tokens[positionOne];
      var positionTwo = positions[j];
      var tokenTwo = tokens[positionTwo];

      directionIterator:
      for (var direction = 1; direction >= -1; direction -= 2) {
        var topToBottom = direction == 1;
        var from = topToBottom ? positionOne + 1 : positionTwo - 1;
        var to = topToBottom ? positionTwo : positionOne;
        var delta = topToBottom ? 1 : -1;
        var moved = topToBottom ? tokenOne : tokenTwo;
        var target = topToBottom ? tokenTwo : tokenOne;
        var movedProperties = extractProperties(moved);

        while (from != to) {
          var traversedProperties = extractProperties(tokens[from]);
          from += delta;

          // traversed then moved as we move selectors towards the start
          var reorderable = topToBottom ?
            canReorder(movedProperties, traversedProperties, specificityCache) :
            canReorder(traversedProperties, movedProperties, specificityCache);

          if (!reorderable && !topToBottom)
            continue selectorIterator;
          if (!reorderable && topToBottom)
            continue directionIterator;
        }

        if (topToBottom) {
          Array.prototype.push.apply(moved[2], target[2]);
          target[2] = moved[2];
        } else {
          Array.prototype.push.apply(target[2], moved[2]);
        }

        optimizeProperties(target[2], true, true, context);
        moved[2] = [];
      }
    }
  }
}

module.exports = mergeNonAdjacentBySelector;
