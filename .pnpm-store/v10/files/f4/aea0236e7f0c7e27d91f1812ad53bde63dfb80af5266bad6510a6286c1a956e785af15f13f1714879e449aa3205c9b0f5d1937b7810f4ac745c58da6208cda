/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var NodePath = require('../../traverse/node-path');

var _require = require('../../transform/utils'),
    disjunctionToList = _require.disjunctionToList,
    listToDisjunction = _require.listToDisjunction;

/**
 * Removes duplicates from a disjunction sequence:
 *
 * /(ab|bc|ab)+(xy|xy)+/ -> /(ab|bc)+(xy)+/
 */


module.exports = {
  Disjunction: function Disjunction(path) {
    var node = path.node;

    // Make unique nodes.

    var uniqueNodesMap = {};

    var parts = disjunctionToList(node).filter(function (part) {
      var encoded = part ? NodePath.getForNode(part).jsonEncode() : 'null';

      // Already recorded this part, filter out.
      if (uniqueNodesMap.hasOwnProperty(encoded)) {
        return false;
      }

      uniqueNodesMap[encoded] = part;
      return true;
    });

    // Replace with the optimized disjunction.
    path.replace(listToDisjunction(parts));
  }
};