"use strict";

const { applyWithChunking } = require("../util");

module.exports = {
  longestPath: longestPath,
  slack: slack
};

/*
 * Initializes ranks for the input graph using the longest path algorithm. This
 * algorithm scales well and is fast in practice, it yields rather poor
 * solutions. Nodes are pushed to the lowest layer possible, leaving the bottom
 * ranks wide and leaving edges longer than necessary. However, due to its
 * speed, this algorithm is good for getting an initial ranking that can be fed
 * into other algorithms.
 *
 * This algorithm does not normalize layers because it will be used by other
 * algorithms in most cases. If using this algorithm directly, be sure to
 * run normalize at the end.
 *
 * Pre-conditions:
 *
 *    1. Input graph is a DAG.
 *    2. Input graph node labels can be assigned properties.
 *
 * Post-conditions:
 *
 *    1. Each node will be assign an (unnormalized) "rank" property.
 */
function longestPath(g) {
  var visited = {};

  function dfs(v) {
    var label = g.node(v);
    if (Object.hasOwn(visited, v)) {
      return label.rank;
    }
    visited[v] = true;

    let outEdgesMinLens = g.outEdges(v).map(e => {
      if (e == null) {
        return Number.POSITIVE_INFINITY;
      }

      return dfs(e.w) - g.edge(e).minlen;
    });

    var rank = applyWithChunking(Math.min, outEdgesMinLens);

    if (rank === Number.POSITIVE_INFINITY) {
      rank = 0;
    }

    return (label.rank = rank);
  }

  g.sources().forEach(dfs);
}

/*
 * Returns the amount of slack for the given edge. The slack is defined as the
 * difference between the length of the edge and its minimum length.
 */
function slack(g, e) {
  return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen;
}
