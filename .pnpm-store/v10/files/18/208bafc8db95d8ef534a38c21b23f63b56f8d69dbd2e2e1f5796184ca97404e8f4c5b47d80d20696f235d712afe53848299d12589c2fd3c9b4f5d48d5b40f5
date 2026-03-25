let Graph = require("@dagrejs/graphlib").Graph;
let List = require("./data/list");

/*
 * A greedy heuristic for finding a feedback arc set for a graph. A feedback
 * arc set is a set of edges that can be removed to make a graph acyclic.
 * The algorithm comes from: P. Eades, X. Lin, and W. F. Smyth, "A fast and
 * effective heuristic for the feedback arc set problem." This implementation
 * adjusts that from the paper to allow for weighted edges.
 */
module.exports = greedyFAS;

let DEFAULT_WEIGHT_FN = () => 1;

function greedyFAS(g, weightFn) {
  if (g.nodeCount() <= 1) {
    return [];
  }
  let state = buildState(g, weightFn || DEFAULT_WEIGHT_FN);
  let results = doGreedyFAS(state.graph, state.buckets, state.zeroIdx);

  // Expand multi-edges
  return results.flatMap(e => g.outEdges(e.v, e.w));
}

function doGreedyFAS(g, buckets, zeroIdx) {
  let results = [];
  let sources = buckets[buckets.length - 1];
  let sinks = buckets[0];

  let entry;
  while (g.nodeCount()) {
    while ((entry = sinks.dequeue()))   { removeNode(g, buckets, zeroIdx, entry); }
    while ((entry = sources.dequeue())) { removeNode(g, buckets, zeroIdx, entry); }
    if (g.nodeCount()) {
      for (let i = buckets.length - 2; i > 0; --i) {
        entry = buckets[i].dequeue();
        if (entry) {
          results = results.concat(removeNode(g, buckets, zeroIdx, entry, true));
          break;
        }
      }
    }
  }

  return results;
}

function removeNode(g, buckets, zeroIdx, entry, collectPredecessors) {
  let results = collectPredecessors ? [] : undefined;

  g.inEdges(entry.v).forEach(edge => {
    let weight = g.edge(edge);
    let uEntry = g.node(edge.v);

    if (collectPredecessors) {
      results.push({ v: edge.v, w: edge.w });
    }

    uEntry.out -= weight;
    assignBucket(buckets, zeroIdx, uEntry);
  });

  g.outEdges(entry.v).forEach(edge => {
    let weight = g.edge(edge);
    let w = edge.w;
    let wEntry = g.node(w);
    wEntry["in"] -= weight;
    assignBucket(buckets, zeroIdx, wEntry);
  });

  g.removeNode(entry.v);

  return results;
}

function buildState(g, weightFn) {
  let fasGraph = new Graph();
  let maxIn = 0;
  let maxOut = 0;

  g.nodes().forEach(v => {
    fasGraph.setNode(v, { v: v, "in": 0, out: 0 });
  });

  // Aggregate weights on nodes, but also sum the weights across multi-edges
  // into a single edge for the fasGraph.
  g.edges().forEach(e => {
    let prevWeight = fasGraph.edge(e.v, e.w) || 0;
    let weight = weightFn(e);
    let edgeWeight = prevWeight + weight;
    fasGraph.setEdge(e.v, e.w, edgeWeight);
    maxOut = Math.max(maxOut, fasGraph.node(e.v).out += weight);
    maxIn  = Math.max(maxIn,  fasGraph.node(e.w)["in"]  += weight);
  });

  let buckets = range(maxOut + maxIn + 3).map(() => new List());
  let zeroIdx = maxIn + 1;

  fasGraph.nodes().forEach(v => {
    assignBucket(buckets, zeroIdx, fasGraph.node(v));
  });

  return { graph: fasGraph, buckets: buckets, zeroIdx: zeroIdx };
}

function assignBucket(buckets, zeroIdx, entry) {
  if (!entry.out) {
    buckets[0].enqueue(entry);
  } else if (!entry["in"]) {
    buckets[buckets.length - 1].enqueue(entry);
  } else {
    buckets[entry.out - entry["in"] + zeroIdx].enqueue(entry);
  }
}

function range(limit) {
  const range = [];
  for (let i = 0; i < limit; i++) {
    range.push(i);
  }

  return range;
}
