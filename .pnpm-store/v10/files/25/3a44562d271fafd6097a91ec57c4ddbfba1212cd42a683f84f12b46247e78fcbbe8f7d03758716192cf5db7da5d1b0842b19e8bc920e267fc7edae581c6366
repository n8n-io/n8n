(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.dagre = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*
Copyright (c) 2012-2014 Chris Pettitt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = {
  graphlib: require("@dagrejs/graphlib"),

  layout: require("./lib/layout"),
  debug: require("./lib/debug"),
  util: {
    time: require("./lib/util").time,
    notime: require("./lib/util").notime
  },
  version: require("./lib/version")
};

},{"./lib/debug":6,"./lib/layout":8,"./lib/util":27,"./lib/version":28,"@dagrejs/graphlib":29}],2:[function(require,module,exports){
"use strict";

let greedyFAS = require("./greedy-fas");
let uniqueId = require("./util").uniqueId;

module.exports = {
  run: run,
  undo: undo
};

function run(g) {
  let fas = (g.graph().acyclicer === "greedy"
    ? greedyFAS(g, weightFn(g))
    : dfsFAS(g));
  fas.forEach(e => {
    let label = g.edge(e);
    g.removeEdge(e);
    label.forwardName = e.name;
    label.reversed = true;
    g.setEdge(e.w, e.v, label, uniqueId("rev"));
  });

  function weightFn(g) {
    return e => {
      return g.edge(e).weight;
    };
  }
}

function dfsFAS(g) {
  let fas = [];
  let stack = {};
  let visited = {};

  function dfs(v) {
    if (Object.hasOwn(visited, v)) {
      return;
    }
    visited[v] = true;
    stack[v] = true;
    g.outEdges(v).forEach(e => {
      if (Object.hasOwn(stack, e.w)) {
        fas.push(e);
      } else {
        dfs(e.w);
      }
    });
    delete stack[v];
  }

  g.nodes().forEach(dfs);
  return fas;
}

function undo(g) {
  g.edges().forEach(e => {
    let label = g.edge(e);
    if (label.reversed) {
      g.removeEdge(e);

      let forwardName = label.forwardName;
      delete label.reversed;
      delete label.forwardName;
      g.setEdge(e.w, e.v, label, forwardName);
    }
  });
}

},{"./greedy-fas":7,"./util":27}],3:[function(require,module,exports){
let util = require("./util");

module.exports = addBorderSegments;

function addBorderSegments(g) {
  function dfs(v) {
    let children = g.children(v);
    let node = g.node(v);
    if (children.length) {
      children.forEach(dfs);
    }

    if (Object.hasOwn(node, "minRank")) {
      node.borderLeft = [];
      node.borderRight = [];
      for (let rank = node.minRank, maxRank = node.maxRank + 1;
        rank < maxRank;
        ++rank) {
        addBorderNode(g, "borderLeft", "_bl", v, node, rank);
        addBorderNode(g, "borderRight", "_br", v, node, rank);
      }
    }
  }

  g.children().forEach(dfs);
}

function addBorderNode(g, prop, prefix, sg, sgNode, rank) {
  let label = { width: 0, height: 0, rank: rank, borderType: prop };
  let prev = sgNode[prop][rank - 1];
  let curr = util.addDummyNode(g, "border", label, prefix);
  sgNode[prop][rank] = curr;
  g.setParent(curr, sg);
  if (prev) {
    g.setEdge(prev, curr, { weight: 1 });
  }
}

},{"./util":27}],4:[function(require,module,exports){
"use strict";

module.exports = {
  adjust: adjust,
  undo: undo
};

function adjust(g) {
  let rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === "lr" || rankDir === "rl") {
    swapWidthHeight(g);
  }
}

function undo(g) {
  let rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === "bt" || rankDir === "rl") {
    reverseY(g);
  }

  if (rankDir === "lr" || rankDir === "rl") {
    swapXY(g);
    swapWidthHeight(g);
  }
}

function swapWidthHeight(g) {
  g.nodes().forEach(v => swapWidthHeightOne(g.node(v)));
  g.edges().forEach(e => swapWidthHeightOne(g.edge(e)));
}

function swapWidthHeightOne(attrs) {
  let w = attrs.width;
  attrs.width = attrs.height;
  attrs.height = w;
}

function reverseY(g) {
  g.nodes().forEach(v => reverseYOne(g.node(v)));

  g.edges().forEach(e => {
    let edge = g.edge(e);
    edge.points.forEach(reverseYOne);
    if (Object.hasOwn(edge, "y")) {
      reverseYOne(edge);
    }
  });
}

function reverseYOne(attrs) {
  attrs.y = -attrs.y;
}

function swapXY(g) {
  g.nodes().forEach(v => swapXYOne(g.node(v)));

  g.edges().forEach(e => {
    let edge = g.edge(e);
    edge.points.forEach(swapXYOne);
    if (Object.hasOwn(edge, "x")) {
      swapXYOne(edge);
    }
  });
}

function swapXYOne(attrs) {
  let x = attrs.x;
  attrs.x = attrs.y;
  attrs.y = x;
}

},{}],5:[function(require,module,exports){
/*
 * Simple doubly linked list implementation derived from Cormen, et al.,
 * "Introduction to Algorithms".
 */

class List {
  constructor() {
    let sentinel = {};
    sentinel._next = sentinel._prev = sentinel;
    this._sentinel = sentinel;
  }

  dequeue() {
    let sentinel = this._sentinel;
    let entry = sentinel._prev;
    if (entry !== sentinel) {
      unlink(entry);
      return entry;
    }
  }

  enqueue(entry) {
    let sentinel = this._sentinel;
    if (entry._prev && entry._next) {
      unlink(entry);
    }
    entry._next = sentinel._next;
    sentinel._next._prev = entry;
    sentinel._next = entry;
    entry._prev = sentinel;
  }

  toString() {
    let strs = [];
    let sentinel = this._sentinel;
    let curr = sentinel._prev;
    while (curr !== sentinel) {
      strs.push(JSON.stringify(curr, filterOutLinks));
      curr = curr._prev;
    }
    return "[" + strs.join(", ") + "]";
  }
}

function unlink(entry) {
  entry._prev._next = entry._next;
  entry._next._prev = entry._prev;
  delete entry._next;
  delete entry._prev;
}

function filterOutLinks(k, v) {
  if (k !== "_next" && k !== "_prev") {
    return v;
  }
}

module.exports = List;

},{}],6:[function(require,module,exports){
let util = require("./util");
let Graph = require("@dagrejs/graphlib").Graph;

module.exports = {
  debugOrdering: debugOrdering
};

/* istanbul ignore next */
function debugOrdering(g) {
  let layerMatrix = util.buildLayerMatrix(g);

  let h = new Graph({ compound: true, multigraph: true }).setGraph({});

  g.nodes().forEach(v => {
    h.setNode(v, { label: v });
    h.setParent(v, "layer" + g.node(v).rank);
  });

  g.edges().forEach(e => h.setEdge(e.v, e.w, {}, e.name));

  layerMatrix.forEach((layer, i) => {
    let layerV = "layer" + i;
    h.setNode(layerV, { rank: "same" });
    layer.reduce((u, v) => {
      h.setEdge(u, v, { style: "invis" });
      return v;
    });
  });

  return h;
}

},{"./util":27,"@dagrejs/graphlib":29}],7:[function(require,module,exports){
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

},{"./data/list":5,"@dagrejs/graphlib":29}],8:[function(require,module,exports){
"use strict";

let acyclic = require("./acyclic");
let normalize = require("./normalize");
let rank = require("./rank");
let normalizeRanks = require("./util").normalizeRanks;
let parentDummyChains = require("./parent-dummy-chains");
let removeEmptyRanks = require("./util").removeEmptyRanks;
let nestingGraph = require("./nesting-graph");
let addBorderSegments = require("./add-border-segments");
let coordinateSystem = require("./coordinate-system");
let order = require("./order");
let position = require("./position");
let util = require("./util");
let Graph = require("@dagrejs/graphlib").Graph;

module.exports = layout;

function layout(g, opts) {
  let time = opts && opts.debugTiming ? util.time : util.notime;
  time("layout", () => {
    let layoutGraph =
      time("  buildLayoutGraph", () => buildLayoutGraph(g));
    time("  runLayout",        () => runLayout(layoutGraph, time, opts));
    time("  updateInputGraph", () => updateInputGraph(g, layoutGraph));
  });
}

function runLayout(g, time, opts) {
  time("    makeSpaceForEdgeLabels", () => makeSpaceForEdgeLabels(g));
  time("    removeSelfEdges",        () => removeSelfEdges(g));
  time("    acyclic",                () => acyclic.run(g));
  time("    nestingGraph.run",       () => nestingGraph.run(g));
  time("    rank",                   () => rank(util.asNonCompoundGraph(g)));
  time("    injectEdgeLabelProxies", () => injectEdgeLabelProxies(g));
  time("    removeEmptyRanks",       () => removeEmptyRanks(g));
  time("    nestingGraph.cleanup",   () => nestingGraph.cleanup(g));
  time("    normalizeRanks",         () => normalizeRanks(g));
  time("    assignRankMinMax",       () => assignRankMinMax(g));
  time("    removeEdgeLabelProxies", () => removeEdgeLabelProxies(g));
  time("    normalize.run",          () => normalize.run(g));
  time("    parentDummyChains",      () => parentDummyChains(g));
  time("    addBorderSegments",      () => addBorderSegments(g));
  time("    order",                  () => order(g, opts));
  time("    insertSelfEdges",        () => insertSelfEdges(g));
  time("    adjustCoordinateSystem", () => coordinateSystem.adjust(g));
  time("    position",               () => position(g));
  time("    positionSelfEdges",      () => positionSelfEdges(g));
  time("    removeBorderNodes",      () => removeBorderNodes(g));
  time("    normalize.undo",         () => normalize.undo(g));
  time("    fixupEdgeLabelCoords",   () => fixupEdgeLabelCoords(g));
  time("    undoCoordinateSystem",   () => coordinateSystem.undo(g));
  time("    translateGraph",         () => translateGraph(g));
  time("    assignNodeIntersects",   () => assignNodeIntersects(g));
  time("    reversePoints",          () => reversePointsForReversedEdges(g));
  time("    acyclic.undo",           () => acyclic.undo(g));
}

/*
 * Copies final layout information from the layout graph back to the input
 * graph. This process only copies whitelisted attributes from the layout graph
 * to the input graph, so it serves as a good place to determine what
 * attributes can influence layout.
 */
function updateInputGraph(inputGraph, layoutGraph) {
  inputGraph.nodes().forEach(v => {
    let inputLabel = inputGraph.node(v);
    let layoutLabel = layoutGraph.node(v);

    if (inputLabel) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
      inputLabel.rank = layoutLabel.rank;

      if (layoutGraph.children(v).length) {
        inputLabel.width = layoutLabel.width;
        inputLabel.height = layoutLabel.height;
      }
    }
  });

  inputGraph.edges().forEach(e => {
    let inputLabel = inputGraph.edge(e);
    let layoutLabel = layoutGraph.edge(e);

    inputLabel.points = layoutLabel.points;
    if (Object.hasOwn(layoutLabel, "x")) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
    }
  });

  inputGraph.graph().width = layoutGraph.graph().width;
  inputGraph.graph().height = layoutGraph.graph().height;
}

let graphNumAttrs = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
let graphDefaults = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "tb" };
let graphAttrs = ["acyclicer", "ranker", "rankdir", "align"];
let nodeNumAttrs = ["width", "height"];
let nodeDefaults = { width: 0, height: 0 };
let edgeNumAttrs = ["minlen", "weight", "width", "height", "labeloffset"];
let edgeDefaults = {
  minlen: 1, weight: 1, width: 0, height: 0,
  labeloffset: 10, labelpos: "r"
};
let edgeAttrs = ["labelpos"];

/*
 * Constructs a new graph from the input graph, which can be used for layout.
 * This process copies only whitelisted attributes from the input graph to the
 * layout graph. Thus this function serves as a good place to determine what
 * attributes can influence layout.
 */
function buildLayoutGraph(inputGraph) {
  let g = new Graph({ multigraph: true, compound: true });
  let graph = canonicalize(inputGraph.graph());

  g.setGraph(Object.assign({},
    graphDefaults,
    selectNumberAttrs(graph, graphNumAttrs),
    util.pick(graph, graphAttrs)));

  inputGraph.nodes().forEach(v => {
    let node = canonicalize(inputGraph.node(v));
    const newNode = selectNumberAttrs(node, nodeNumAttrs);
    Object.keys(nodeDefaults).forEach(k => {
      if (newNode[k] === undefined) {
        newNode[k] = nodeDefaults[k];
      }
    });

    g.setNode(v, newNode);
    g.setParent(v, inputGraph.parent(v));
  });

  inputGraph.edges().forEach(e => {
    let edge = canonicalize(inputGraph.edge(e));
    g.setEdge(e, Object.assign({},
      edgeDefaults,
      selectNumberAttrs(edge, edgeNumAttrs),
      util.pick(edge, edgeAttrs)));
  });

  return g;
}

/*
 * This idea comes from the Gansner paper: to account for edge labels in our
 * layout we split each rank in half by doubling minlen and halving ranksep.
 * Then we can place labels at these mid-points between nodes.
 *
 * We also add some minimal padding to the width to push the label for the edge
 * away from the edge itself a bit.
 */
function makeSpaceForEdgeLabels(g) {
  let graph = g.graph();
  graph.ranksep /= 2;
  g.edges().forEach(e => {
    let edge = g.edge(e);
    edge.minlen *= 2;
    if (edge.labelpos.toLowerCase() !== "c") {
      if (graph.rankdir === "TB" || graph.rankdir === "BT") {
        edge.width += edge.labeloffset;
      } else {
        edge.height += edge.labeloffset;
      }
    }
  });
}

/*
 * Creates temporary dummy nodes that capture the rank in which each edge's
 * label is going to, if it has one of non-zero width and height. We do this
 * so that we can safely remove empty ranks while preserving balance for the
 * label's position.
 */
function injectEdgeLabelProxies(g) {
  g.edges().forEach(e => {
    let edge = g.edge(e);
    if (edge.width && edge.height) {
      let v = g.node(e.v);
      let w = g.node(e.w);
      let label = { rank: (w.rank - v.rank) / 2 + v.rank, e: e };
      util.addDummyNode(g, "edge-proxy", label, "_ep");
    }
  });
}

function assignRankMinMax(g) {
  let maxRank = 0;
  g.nodes().forEach(v => {
    let node = g.node(v);
    if (node.borderTop) {
      node.minRank = g.node(node.borderTop).rank;
      node.maxRank = g.node(node.borderBottom).rank;
      maxRank = Math.max(maxRank, node.maxRank);
    }
  });
  g.graph().maxRank = maxRank;
}

function removeEdgeLabelProxies(g) {
  g.nodes().forEach(v => {
    let node = g.node(v);
    if (node.dummy === "edge-proxy") {
      g.edge(node.e).labelRank = node.rank;
      g.removeNode(v);
    }
  });
}

function translateGraph(g) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = 0;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = 0;
  let graphLabel = g.graph();
  let marginX = graphLabel.marginx || 0;
  let marginY = graphLabel.marginy || 0;

  function getExtremes(attrs) {
    let x = attrs.x;
    let y = attrs.y;
    let w = attrs.width;
    let h = attrs.height;
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2);
    maxY = Math.max(maxY, y + h / 2);
  }

  g.nodes().forEach(v => getExtremes(g.node(v)));
  g.edges().forEach(e => {
    let edge = g.edge(e);
    if (Object.hasOwn(edge, "x")) {
      getExtremes(edge);
    }
  });

  minX -= marginX;
  minY -= marginY;

  g.nodes().forEach(v => {
    let node = g.node(v);
    node.x -= minX;
    node.y -= minY;
  });

  g.edges().forEach(e => {
    let edge = g.edge(e);
    edge.points.forEach(p => {
      p.x -= minX;
      p.y -= minY;
    });
    if (Object.hasOwn(edge, "x")) { edge.x -= minX; }
    if (Object.hasOwn(edge, "y")) { edge.y -= minY; }
  });

  graphLabel.width = maxX - minX + marginX;
  graphLabel.height = maxY - minY + marginY;
}

function assignNodeIntersects(g) {
  g.edges().forEach(e => {
    let edge = g.edge(e);
    let nodeV = g.node(e.v);
    let nodeW = g.node(e.w);
    let p1, p2;
    if (!edge.points) {
      edge.points = [];
      p1 = nodeW;
      p2 = nodeV;
    } else {
      p1 = edge.points[0];
      p2 = edge.points[edge.points.length - 1];
    }
    edge.points.unshift(util.intersectRect(nodeV, p1));
    edge.points.push(util.intersectRect(nodeW, p2));
  });
}

function fixupEdgeLabelCoords(g) {
  g.edges().forEach(e => {
    let edge = g.edge(e);
    if (Object.hasOwn(edge, "x")) {
      if (edge.labelpos === "l" || edge.labelpos === "r") {
        edge.width -= edge.labeloffset;
      }
      switch (edge.labelpos) {
      case "l": edge.x -= edge.width / 2 + edge.labeloffset; break;
      case "r": edge.x += edge.width / 2 + edge.labeloffset; break;
      }
    }
  });
}

function reversePointsForReversedEdges(g) {
  g.edges().forEach(e => {
    let edge = g.edge(e);
    if (edge.reversed) {
      edge.points.reverse();
    }
  });
}

function removeBorderNodes(g) {
  g.nodes().forEach(v => {
    if (g.children(v).length) {
      let node = g.node(v);
      let t = g.node(node.borderTop);
      let b = g.node(node.borderBottom);
      let l = g.node(node.borderLeft[node.borderLeft.length - 1]);
      let r = g.node(node.borderRight[node.borderRight.length - 1]);

      node.width = Math.abs(r.x - l.x);
      node.height = Math.abs(b.y - t.y);
      node.x = l.x + node.width / 2;
      node.y = t.y + node.height / 2;
    }
  });

  g.nodes().forEach(v => {
    if (g.node(v).dummy === "border") {
      g.removeNode(v);
    }
  });
}

function removeSelfEdges(g) {
  g.edges().forEach(e => {
    if (e.v === e.w) {
      var node = g.node(e.v);
      if (!node.selfEdges) {
        node.selfEdges = [];
      }
      node.selfEdges.push({ e: e, label: g.edge(e) });
      g.removeEdge(e);
    }
  });
}

function insertSelfEdges(g) {
  var layers = util.buildLayerMatrix(g);
  layers.forEach(layer => {
    var orderShift = 0;
    layer.forEach((v, i) => {
      var node = g.node(v);
      node.order = i + orderShift;
      (node.selfEdges || []).forEach(selfEdge => {
        util.addDummyNode(g, "selfedge", {
          width: selfEdge.label.width,
          height: selfEdge.label.height,
          rank: node.rank,
          order: i + (++orderShift),
          e: selfEdge.e,
          label: selfEdge.label
        }, "_se");
      });
      delete node.selfEdges;
    });
  });
}

function positionSelfEdges(g) {
  g.nodes().forEach(v => {
    var node = g.node(v);
    if (node.dummy === "selfedge") {
      var selfNode = g.node(node.e.v);
      var x = selfNode.x + selfNode.width / 2;
      var y = selfNode.y;
      var dx = node.x - x;
      var dy = selfNode.height / 2;
      g.setEdge(node.e, node.label);
      g.removeNode(v);
      node.label.points = [
        { x: x + 2 * dx / 3, y: y - dy },
        { x: x + 5 * dx / 6, y: y - dy },
        { x: x +     dx    , y: y },
        { x: x + 5 * dx / 6, y: y + dy },
        { x: x + 2 * dx / 3, y: y + dy }
      ];
      node.label.x = node.x;
      node.label.y = node.y;
    }
  });
}

function selectNumberAttrs(obj, attrs) {
  return util.mapValues(util.pick(obj, attrs), Number);
}

function canonicalize(attrs) {
  var newAttrs = {};
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (typeof k === "string") {
        k = k.toLowerCase();
      }

      newAttrs[k] = v;
    });
  }
  return newAttrs;
}

},{"./acyclic":2,"./add-border-segments":3,"./coordinate-system":4,"./nesting-graph":9,"./normalize":10,"./order":15,"./parent-dummy-chains":20,"./position":22,"./rank":24,"./util":27,"@dagrejs/graphlib":29}],9:[function(require,module,exports){
let util = require("./util");

module.exports = {
  run,
  cleanup,
};

/*
 * A nesting graph creates dummy nodes for the tops and bottoms of subgraphs,
 * adds appropriate edges to ensure that all cluster nodes are placed between
 * these boundaries, and ensures that the graph is connected.
 *
 * In addition we ensure, through the use of the minlen property, that nodes
 * and subgraph border nodes to not end up on the same rank.
 *
 * Preconditions:
 *
 *    1. Input graph is a DAG
 *    2. Nodes in the input graph has a minlen attribute
 *
 * Postconditions:
 *
 *    1. Input graph is connected.
 *    2. Dummy nodes are added for the tops and bottoms of subgraphs.
 *    3. The minlen attribute for nodes is adjusted to ensure nodes do not
 *       get placed on the same rank as subgraph border nodes.
 *
 * The nesting graph idea comes from Sander, "Layout of Compound Directed
 * Graphs."
 */
function run(g) {
  let root = util.addDummyNode(g, "root", {}, "_root");
  let depths = treeDepths(g);
  let depthsArr = Object.values(depths);
  let height = util.applyWithChunking(Math.max, depthsArr) - 1; // Note: depths is an Object not an array
  let nodeSep = 2 * height + 1;

  g.graph().nestingRoot = root;

  // Multiply minlen by nodeSep to align nodes on non-border ranks.
  g.edges().forEach(e => g.edge(e).minlen *= nodeSep);

  // Calculate a weight that is sufficient to keep subgraphs vertically compact
  let weight = sumWeights(g) + 1;

  // Create border nodes and link them up
  g.children().forEach(child => dfs(g, root, nodeSep, weight, height, depths, child));

  // Save the multiplier for node layers for later removal of empty border
  // layers.
  g.graph().nodeRankFactor = nodeSep;
}

function dfs(g, root, nodeSep, weight, height, depths, v) {
  let children = g.children(v);
  if (!children.length) {
    if (v !== root) {
      g.setEdge(root, v, { weight: 0, minlen: nodeSep });
    }
    return;
  }

  let top = util.addBorderNode(g, "_bt");
  let bottom = util.addBorderNode(g, "_bb");
  let label = g.node(v);

  g.setParent(top, v);
  label.borderTop = top;
  g.setParent(bottom, v);
  label.borderBottom = bottom;

  children.forEach(child => {
    dfs(g, root, nodeSep, weight, height, depths, child);

    let childNode = g.node(child);
    let childTop = childNode.borderTop ? childNode.borderTop : child;
    let childBottom = childNode.borderBottom ? childNode.borderBottom : child;
    let thisWeight = childNode.borderTop ? weight : 2 * weight;
    let minlen = childTop !== childBottom ? 1 : height - depths[v] + 1;

    g.setEdge(top, childTop, {
      weight: thisWeight,
      minlen: minlen,
      nestingEdge: true
    });

    g.setEdge(childBottom, bottom, {
      weight: thisWeight,
      minlen: minlen,
      nestingEdge: true
    });
  });

  if (!g.parent(v)) {
    g.setEdge(root, top, { weight: 0, minlen: height + depths[v] });
  }
}

function treeDepths(g) {
  var depths = {};
  function dfs(v, depth) {
    var children = g.children(v);
    if (children && children.length) {
      children.forEach(child => dfs(child, depth + 1));
    }
    depths[v] = depth;
  }
  g.children().forEach(v => dfs(v, 1));
  return depths;
}

function sumWeights(g) {
  return g.edges().reduce((acc, e) => acc + g.edge(e).weight, 0);
}

function cleanup(g) {
  var graphLabel = g.graph();
  g.removeNode(graphLabel.nestingRoot);
  delete graphLabel.nestingRoot;
  g.edges().forEach(e => {
    var edge = g.edge(e);
    if (edge.nestingEdge) {
      g.removeEdge(e);
    }
  });
}

},{"./util":27}],10:[function(require,module,exports){
"use strict";

let util = require("./util");

module.exports = {
  run: run,
  undo: undo
};

/*
 * Breaks any long edges in the graph into short segments that span 1 layer
 * each. This operation is undoable with the denormalize function.
 *
 * Pre-conditions:
 *
 *    1. The input graph is a DAG.
 *    2. Each node in the graph has a "rank" property.
 *
 * Post-condition:
 *
 *    1. All edges in the graph have a length of 1.
 *    2. Dummy nodes are added where edges have been split into segments.
 *    3. The graph is augmented with a "dummyChains" attribute which contains
 *       the first dummy in each chain of dummy nodes produced.
 */
function run(g) {
  g.graph().dummyChains = [];
  g.edges().forEach(edge => normalizeEdge(g, edge));
}

function normalizeEdge(g, e) {
  let v = e.v;
  let vRank = g.node(v).rank;
  let w = e.w;
  let wRank = g.node(w).rank;
  let name = e.name;
  let edgeLabel = g.edge(e);
  let labelRank = edgeLabel.labelRank;

  if (wRank === vRank + 1) return;

  g.removeEdge(e);

  let dummy, attrs, i;
  for (i = 0, ++vRank; vRank < wRank; ++i, ++vRank) {
    edgeLabel.points = [];
    attrs = {
      width: 0, height: 0,
      edgeLabel: edgeLabel, edgeObj: e,
      rank: vRank
    };
    dummy = util.addDummyNode(g, "edge", attrs, "_d");
    if (vRank === labelRank) {
      attrs.width = edgeLabel.width;
      attrs.height = edgeLabel.height;
      attrs.dummy = "edge-label";
      attrs.labelpos = edgeLabel.labelpos;
    }
    g.setEdge(v, dummy, { weight: edgeLabel.weight }, name);
    if (i === 0) {
      g.graph().dummyChains.push(dummy);
    }
    v = dummy;
  }

  g.setEdge(v, w, { weight: edgeLabel.weight }, name);
}

function undo(g) {
  g.graph().dummyChains.forEach(v => {
    let node = g.node(v);
    let origLabel = node.edgeLabel;
    let w;
    g.setEdge(node.edgeObj, origLabel);
    while (node.dummy) {
      w = g.successors(v)[0];
      g.removeNode(v);
      origLabel.points.push({ x: node.x, y: node.y });
      if (node.dummy === "edge-label") {
        origLabel.x = node.x;
        origLabel.y = node.y;
        origLabel.width = node.width;
        origLabel.height = node.height;
      }
      v = w;
      node = g.node(v);
    }
  });
}

},{"./util":27}],11:[function(require,module,exports){
module.exports = addSubgraphConstraints;

function addSubgraphConstraints(g, cg, vs) {
  let prev = {},
    rootPrev;

  vs.forEach(v => {
    let child = g.parent(v),
      parent,
      prevChild;
    while (child) {
      parent = g.parent(child);
      if (parent) {
        prevChild = prev[parent];
        prev[parent] = child;
      } else {
        prevChild = rootPrev;
        rootPrev = child;
      }
      if (prevChild && prevChild !== child) {
        cg.setEdge(prevChild, child);
        return;
      }
      child = parent;
    }
  });

  /*
  function dfs(v) {
    var children = v ? g.children(v) : g.children();
    if (children.length) {
      var min = Number.POSITIVE_INFINITY,
          subgraphs = [];
      children.forEach(function(child) {
        var childMin = dfs(child);
        if (g.children(child).length) {
          subgraphs.push({ v: child, order: childMin });
        }
        min = Math.min(min, childMin);
      });
      _.sortBy(subgraphs, "order").reduce(function(prev, curr) {
        cg.setEdge(prev.v, curr.v);
        return curr;
      });
      return min;
    }
    return g.node(v).order;
  }
  dfs(undefined);
  */
}

},{}],12:[function(require,module,exports){
module.exports = barycenter;

function barycenter(g, movable = []) {
  return movable.map(v => {
    let inV = g.inEdges(v);
    if (!inV.length) {
      return { v: v };
    } else {
      let result = inV.reduce((acc, e) => {
        let edge = g.edge(e),
          nodeU = g.node(e.v);
        return {
          sum: acc.sum + (edge.weight * nodeU.order),
          weight: acc.weight + edge.weight
        };
      }, { sum: 0, weight: 0 });

      return {
        v: v,
        barycenter: result.sum / result.weight,
        weight: result.weight
      };
    }
  });
}


},{}],13:[function(require,module,exports){
let Graph = require("@dagrejs/graphlib").Graph;
let util = require("../util");

module.exports = buildLayerGraph;

/*
 * Constructs a graph that can be used to sort a layer of nodes. The graph will
 * contain all base and subgraph nodes from the request layer in their original
 * hierarchy and any edges that are incident on these nodes and are of the type
 * requested by the "relationship" parameter.
 *
 * Nodes from the requested rank that do not have parents are assigned a root
 * node in the output graph, which is set in the root graph attribute. This
 * makes it easy to walk the hierarchy of movable nodes during ordering.
 *
 * Pre-conditions:
 *
 *    1. Input graph is a DAG
 *    2. Base nodes in the input graph have a rank attribute
 *    3. Subgraph nodes in the input graph has minRank and maxRank attributes
 *    4. Edges have an assigned weight
 *
 * Post-conditions:
 *
 *    1. Output graph has all nodes in the movable rank with preserved
 *       hierarchy.
 *    2. Root nodes in the movable layer are made children of the node
 *       indicated by the root attribute of the graph.
 *    3. Non-movable nodes incident on movable nodes, selected by the
 *       relationship parameter, are included in the graph (without hierarchy).
 *    4. Edges incident on movable nodes, selected by the relationship
 *       parameter, are added to the output graph.
 *    5. The weights for copied edges are aggregated as need, since the output
 *       graph is not a multi-graph.
 */
function buildLayerGraph(g, rank, relationship) {
  let root = createRootNode(g),
    result = new Graph({ compound: true }).setGraph({ root: root })
      .setDefaultNodeLabel(v => g.node(v));

  g.nodes().forEach(v => {
    let node = g.node(v),
      parent = g.parent(v);

    if (node.rank === rank || node.minRank <= rank && rank <= node.maxRank) {
      result.setNode(v);
      result.setParent(v, parent || root);

      // This assumes we have only short edges!
      g[relationship](v).forEach(e => {
        let u = e.v === v ? e.w : e.v,
          edge = result.edge(u, v),
          weight = edge !== undefined ? edge.weight : 0;
        result.setEdge(u, v, { weight: g.edge(e).weight + weight });
      });

      if (Object.hasOwn(node, "minRank")) {
        result.setNode(v, {
          borderLeft: node.borderLeft[rank],
          borderRight: node.borderRight[rank]
        });
      }
    }
  });

  return result;
}

function createRootNode(g) {
  var v;
  while (g.hasNode((v = util.uniqueId("_root"))));
  return v;
}

},{"../util":27,"@dagrejs/graphlib":29}],14:[function(require,module,exports){
"use strict";

let zipObject = require("../util").zipObject;

module.exports = crossCount;

/*
 * A function that takes a layering (an array of layers, each with an array of
 * ordererd nodes) and a graph and returns a weighted crossing count.
 *
 * Pre-conditions:
 *
 *    1. Input graph must be simple (not a multigraph), directed, and include
 *       only simple edges.
 *    2. Edges in the input graph must have assigned weights.
 *
 * Post-conditions:
 *
 *    1. The graph and layering matrix are left unchanged.
 *
 * This algorithm is derived from Barth, et al., "Bilayer Cross Counting."
 */
function crossCount(g, layering) {
  let cc = 0;
  for (let i = 1; i < layering.length; ++i) {
    cc += twoLayerCrossCount(g, layering[i-1], layering[i]);
  }
  return cc;
}

function twoLayerCrossCount(g, northLayer, southLayer) {
  // Sort all of the edges between the north and south layers by their position
  // in the north layer and then the south. Map these edges to the position of
  // their head in the south layer.
  let southPos = zipObject(southLayer, southLayer.map((v, i) => i));
  let southEntries = northLayer.flatMap(v => {
    return g.outEdges(v).map(e => {
      return { pos: southPos[e.w], weight: g.edge(e).weight };
    }).sort((a, b) => a.pos - b.pos);
  });

  // Build the accumulator tree
  let firstIndex = 1;
  while (firstIndex < southLayer.length) firstIndex <<= 1;
  let treeSize = 2 * firstIndex - 1;
  firstIndex -= 1;
  let tree = new Array(treeSize).fill(0);

  // Calculate the weighted crossings
  let cc = 0;
  southEntries.forEach(entry => {
    let index = entry.pos + firstIndex;
    tree[index] += entry.weight;
    let weightSum = 0;
    while (index > 0) {
      if (index % 2) {
        weightSum += tree[index + 1];
      }
      index = (index - 1) >> 1;
      tree[index] += entry.weight;
    }
    cc += entry.weight * weightSum;
  });

  return cc;
}

},{"../util":27}],15:[function(require,module,exports){
"use strict";

let initOrder = require("./init-order");
let crossCount = require("./cross-count");
let sortSubgraph = require("./sort-subgraph");
let buildLayerGraph = require("./build-layer-graph");
let addSubgraphConstraints = require("./add-subgraph-constraints");
let Graph = require("@dagrejs/graphlib").Graph;
let util = require("../util");

module.exports = order;

/*
 * Applies heuristics to minimize edge crossings in the graph and sets the best
 * order solution as an order attribute on each node.
 *
 * Pre-conditions:
 *
 *    1. Graph must be DAG
 *    2. Graph nodes must be objects with a "rank" attribute
 *    3. Graph edges must have the "weight" attribute
 *
 * Post-conditions:
 *
 *    1. Graph nodes will have an "order" attribute based on the results of the
 *       algorithm.
 */
function order(g, opts) {
  if (opts && typeof opts.customOrder === 'function') {
    opts.customOrder(g, order);
    return;
  }

  let maxRank = util.maxRank(g),
    downLayerGraphs = buildLayerGraphs(g, util.range(1, maxRank + 1), "inEdges"),
    upLayerGraphs = buildLayerGraphs(g, util.range(maxRank - 1, -1, -1), "outEdges");

  let layering = initOrder(g);
  assignOrder(g, layering);

  if (opts && opts.disableOptimalOrderHeuristic) {
    return;
  }

  let bestCC = Number.POSITIVE_INFINITY,
    best;

  for (let i = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
    sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);

    layering = util.buildLayerMatrix(g);
    let cc = crossCount(g, layering);
    if (cc < bestCC) {
      lastBest = 0;
      best = Object.assign({}, layering);
      bestCC = cc;
    }
  }

  assignOrder(g, best);
}

function buildLayerGraphs(g, ranks, relationship) {
  return ranks.map(function(rank) {
    return buildLayerGraph(g, rank, relationship);
  });
}

function sweepLayerGraphs(layerGraphs, biasRight) {
  let cg = new Graph();
  layerGraphs.forEach(function(lg) {
    let root = lg.graph().root;
    let sorted = sortSubgraph(lg, root, cg, biasRight);
    sorted.vs.forEach((v, i) => lg.node(v).order = i);
    addSubgraphConstraints(lg, cg, sorted.vs);
  });
}

function assignOrder(g, layering) {
  Object.values(layering).forEach(layer => layer.forEach((v, i) => g.node(v).order = i));
}

},{"../util":27,"./add-subgraph-constraints":11,"./build-layer-graph":13,"./cross-count":14,"./init-order":16,"./sort-subgraph":18,"@dagrejs/graphlib":29}],16:[function(require,module,exports){
"use strict";

let util = require("../util");

module.exports = initOrder;

/*
 * Assigns an initial order value for each node by performing a DFS search
 * starting from nodes in the first rank. Nodes are assigned an order in their
 * rank as they are first visited.
 *
 * This approach comes from Gansner, et al., "A Technique for Drawing Directed
 * Graphs."
 *
 * Returns a layering matrix with an array per layer and each layer sorted by
 * the order of its nodes.
 */
function initOrder(g) {
  let visited = {};
  let simpleNodes = g.nodes().filter(v => !g.children(v).length);
  let simpleNodesRanks = simpleNodes.map(v => g.node(v).rank);
  let maxRank = util.applyWithChunking(Math.max, simpleNodesRanks);
  let layers = util.range(maxRank + 1).map(() => []);

  function dfs(v) {
    if (visited[v]) return;
    visited[v] = true;
    let node = g.node(v);
    layers[node.rank].push(v);
    g.successors(v).forEach(dfs);
  }

  let orderedVs = simpleNodes.sort((a, b) => g.node(a).rank - g.node(b).rank);
  orderedVs.forEach(dfs);

  return layers;
}

},{"../util":27}],17:[function(require,module,exports){
"use strict";

let util = require("../util");

module.exports = resolveConflicts;

/*
 * Given a list of entries of the form {v, barycenter, weight} and a
 * constraint graph this function will resolve any conflicts between the
 * constraint graph and the barycenters for the entries. If the barycenters for
 * an entry would violate a constraint in the constraint graph then we coalesce
 * the nodes in the conflict into a new node that respects the contraint and
 * aggregates barycenter and weight information.
 *
 * This implementation is based on the description in Forster, "A Fast and
 * Simple Hueristic for Constrained Two-Level Crossing Reduction," thought it
 * differs in some specific details.
 *
 * Pre-conditions:
 *
 *    1. Each entry has the form {v, barycenter, weight}, or if the node has
 *       no barycenter, then {v}.
 *
 * Returns:
 *
 *    A new list of entries of the form {vs, i, barycenter, weight}. The list
 *    `vs` may either be a singleton or it may be an aggregation of nodes
 *    ordered such that they do not violate constraints from the constraint
 *    graph. The property `i` is the lowest original index of any of the
 *    elements in `vs`.
 */
function resolveConflicts(entries, cg) {
  let mappedEntries = {};
  entries.forEach((entry, i) => {
    let tmp = mappedEntries[entry.v] = {
      indegree: 0,
      "in": [],
      out: [],
      vs: [entry.v],
      i: i
    };
    if (entry.barycenter !== undefined) {
      tmp.barycenter = entry.barycenter;
      tmp.weight = entry.weight;
    }
  });

  cg.edges().forEach(e => {
    let entryV = mappedEntries[e.v];
    let entryW = mappedEntries[e.w];
    if (entryV !== undefined && entryW !== undefined) {
      entryW.indegree++;
      entryV.out.push(mappedEntries[e.w]);
    }
  });

  let sourceSet = Object.values(mappedEntries).filter(entry => !entry.indegree);

  return doResolveConflicts(sourceSet);
}

function doResolveConflicts(sourceSet) {
  let entries = [];

  function handleIn(vEntry) {
    return uEntry => {
      if (uEntry.merged) {
        return;
      }
      if (uEntry.barycenter === undefined ||
          vEntry.barycenter === undefined ||
          uEntry.barycenter >= vEntry.barycenter) {
        mergeEntries(vEntry, uEntry);
      }
    };
  }

  function handleOut(vEntry) {
    return wEntry => {
      wEntry["in"].push(vEntry);
      if (--wEntry.indegree === 0) {
        sourceSet.push(wEntry);
      }
    };
  }

  while (sourceSet.length) {
    let entry = sourceSet.pop();
    entries.push(entry);
    entry["in"].reverse().forEach(handleIn(entry));
    entry.out.forEach(handleOut(entry));
  }

  return entries.filter(entry => !entry.merged).map(entry => {
    return util.pick(entry, ["vs", "i", "barycenter", "weight"]);
  });
}

function mergeEntries(target, source) {
  let sum = 0;
  let weight = 0;

  if (target.weight) {
    sum += target.barycenter * target.weight;
    weight += target.weight;
  }

  if (source.weight) {
    sum += source.barycenter * source.weight;
    weight += source.weight;
  }

  target.vs = source.vs.concat(target.vs);
  target.barycenter = sum / weight;
  target.weight = weight;
  target.i = Math.min(source.i, target.i);
  source.merged = true;
}

},{"../util":27}],18:[function(require,module,exports){
let barycenter = require("./barycenter");
let resolveConflicts = require("./resolve-conflicts");
let sort = require("./sort");

module.exports = sortSubgraph;

function sortSubgraph(g, v, cg, biasRight) {
  let movable = g.children(v);
  let node = g.node(v);
  let bl = node ? node.borderLeft : undefined;
  let br = node ? node.borderRight: undefined;
  let subgraphs = {};

  if (bl) {
    movable = movable.filter(w => w !== bl && w !== br);
  }

  let barycenters = barycenter(g, movable);
  barycenters.forEach(entry => {
    if (g.children(entry.v).length) {
      let subgraphResult = sortSubgraph(g, entry.v, cg, biasRight);
      subgraphs[entry.v] = subgraphResult;
      if (Object.hasOwn(subgraphResult, "barycenter")) {
        mergeBarycenters(entry, subgraphResult);
      }
    }
  });

  let entries = resolveConflicts(barycenters, cg);
  expandSubgraphs(entries, subgraphs);

  let result = sort(entries, biasRight);

  if (bl) {
    result.vs = [bl, result.vs, br].flat(true);
    if (g.predecessors(bl).length) {
      let blPred = g.node(g.predecessors(bl)[0]),
        brPred = g.node(g.predecessors(br)[0]);
      if (!Object.hasOwn(result, "barycenter")) {
        result.barycenter = 0;
        result.weight = 0;
      }
      result.barycenter = (result.barycenter * result.weight +
                           blPred.order + brPred.order) / (result.weight + 2);
      result.weight += 2;
    }
  }

  return result;
}

function expandSubgraphs(entries, subgraphs) {
  entries.forEach(entry => {
    entry.vs = entry.vs.flatMap(v => {
      if (subgraphs[v]) {
        return subgraphs[v].vs;
      }
      return v;
    });
  });
}

function mergeBarycenters(target, other) {
  if (target.barycenter !== undefined) {
    target.barycenter = (target.barycenter * target.weight +
                         other.barycenter * other.weight) /
                        (target.weight + other.weight);
    target.weight += other.weight;
  } else {
    target.barycenter = other.barycenter;
    target.weight = other.weight;
  }
}

},{"./barycenter":12,"./resolve-conflicts":17,"./sort":19}],19:[function(require,module,exports){
let util = require("../util");

module.exports = sort;

function sort(entries, biasRight) {
  let parts = util.partition(entries, entry => {
    return Object.hasOwn(entry, "barycenter");
  });
  let sortable = parts.lhs,
    unsortable = parts.rhs.sort((a, b) => b.i - a.i),
    vs = [],
    sum = 0,
    weight = 0,
    vsIndex = 0;

  sortable.sort(compareWithBias(!!biasRight));

  vsIndex = consumeUnsortable(vs, unsortable, vsIndex);

  sortable.forEach(entry => {
    vsIndex += entry.vs.length;
    vs.push(entry.vs);
    sum += entry.barycenter * entry.weight;
    weight += entry.weight;
    vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
  });

  let result = { vs: vs.flat(true) };
  if (weight) {
    result.barycenter = sum / weight;
    result.weight = weight;
  }
  return result;
}

function consumeUnsortable(vs, unsortable, index) {
  let last;
  while (unsortable.length && (last = unsortable[unsortable.length - 1]).i <= index) {
    unsortable.pop();
    vs.push(last.vs);
    index++;
  }
  return index;
}

function compareWithBias(bias) {
  return (entryV, entryW) => {
    if (entryV.barycenter < entryW.barycenter) {
      return -1;
    } else if (entryV.barycenter > entryW.barycenter) {
      return 1;
    }

    return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
  };
}

},{"../util":27}],20:[function(require,module,exports){
module.exports = parentDummyChains;

function parentDummyChains(g) {
  let postorderNums = postorder(g);

  g.graph().dummyChains.forEach(v => {
    let node = g.node(v);
    let edgeObj = node.edgeObj;
    let pathData = findPath(g, postorderNums, edgeObj.v, edgeObj.w);
    let path = pathData.path;
    let lca = pathData.lca;
    let pathIdx = 0;
    let pathV = path[pathIdx];
    let ascending = true;

    while (v !== edgeObj.w) {
      node = g.node(v);

      if (ascending) {
        while ((pathV = path[pathIdx]) !== lca &&
               g.node(pathV).maxRank < node.rank) {
          pathIdx++;
        }

        if (pathV === lca) {
          ascending = false;
        }
      }

      if (!ascending) {
        while (pathIdx < path.length - 1 &&
               g.node(pathV = path[pathIdx + 1]).minRank <= node.rank) {
          pathIdx++;
        }
        pathV = path[pathIdx];
      }

      g.setParent(v, pathV);
      v = g.successors(v)[0];
    }
  });
}

// Find a path from v to w through the lowest common ancestor (LCA). Return the
// full path and the LCA.
function findPath(g, postorderNums, v, w) {
  let vPath = [];
  let wPath = [];
  let low = Math.min(postorderNums[v].low, postorderNums[w].low);
  let lim = Math.max(postorderNums[v].lim, postorderNums[w].lim);
  let parent;
  let lca;

  // Traverse up from v to find the LCA
  parent = v;
  do {
    parent = g.parent(parent);
    vPath.push(parent);
  } while (parent &&
           (postorderNums[parent].low > low || lim > postorderNums[parent].lim));
  lca = parent;

  // Traverse from w to LCA
  parent = w;
  while ((parent = g.parent(parent)) !== lca) {
    wPath.push(parent);
  }

  return { path: vPath.concat(wPath.reverse()), lca: lca };
}

function postorder(g) {
  let result = {};
  let lim = 0;

  function dfs(v) {
    let low = lim;
    g.children(v).forEach(dfs);
    result[v] = { low: low, lim: lim++ };
  }
  g.children().forEach(dfs);

  return result;
}

},{}],21:[function(require,module,exports){
"use strict";

let Graph = require("@dagrejs/graphlib").Graph;
let util = require("../util");

/*
 * This module provides coordinate assignment based on Brandes and Köpf, "Fast
 * and Simple Horizontal Coordinate Assignment."
 */

module.exports = {
  positionX: positionX,
  findType1Conflicts: findType1Conflicts,
  findType2Conflicts: findType2Conflicts,
  addConflict: addConflict,
  hasConflict: hasConflict,
  verticalAlignment: verticalAlignment,
  horizontalCompaction: horizontalCompaction,
  alignCoordinates: alignCoordinates,
  findSmallestWidthAlignment: findSmallestWidthAlignment,
  balance: balance
};

/*
 * Marks all edges in the graph with a type-1 conflict with the "type1Conflict"
 * property. A type-1 conflict is one where a non-inner segment crosses an
 * inner segment. An inner segment is an edge with both incident nodes marked
 * with the "dummy" property.
 *
 * This algorithm scans layer by layer, starting with the second, for type-1
 * conflicts between the current layer and the previous layer. For each layer
 * it scans the nodes from left to right until it reaches one that is incident
 * on an inner segment. It then scans predecessors to determine if they have
 * edges that cross that inner segment. At the end a final scan is done for all
 * nodes on the current rank to see if they cross the last visited inner
 * segment.
 *
 * This algorithm (safely) assumes that a dummy node will only be incident on a
 * single node in the layers being scanned.
 */
function findType1Conflicts(g, layering) {
  let conflicts = {};

  function visitLayer(prevLayer, layer) {
    let
      // last visited node in the previous layer that is incident on an inner
      // segment.
      k0 = 0,
      // Tracks the last node in this layer scanned for crossings with a type-1
      // segment.
      scanPos = 0,
      prevLayerLength = prevLayer.length,
      lastNode = layer[layer.length - 1];

    layer.forEach((v, i) => {
      let w = findOtherInnerSegmentNode(g, v),
        k1 = w ? g.node(w).order : prevLayerLength;

      if (w || v === lastNode) {
        layer.slice(scanPos, i+1).forEach(scanNode => {
          g.predecessors(scanNode).forEach(u => {
            let uLabel = g.node(u),
              uPos = uLabel.order;
            if ((uPos < k0 || k1 < uPos) &&
                !(uLabel.dummy && g.node(scanNode).dummy)) {
              addConflict(conflicts, u, scanNode);
            }
          });
        });
        scanPos = i + 1;
        k0 = k1;
      }
    });

    return layer;
  }

  layering.length && layering.reduce(visitLayer);

  return conflicts;
}

function findType2Conflicts(g, layering) {
  let conflicts = {};

  function scan(south, southPos, southEnd, prevNorthBorder, nextNorthBorder) {
    let v;
    util.range(southPos, southEnd).forEach(i => {
      v = south[i];
      if (g.node(v).dummy) {
        g.predecessors(v).forEach(u => {
          let uNode = g.node(u);
          if (uNode.dummy &&
              (uNode.order < prevNorthBorder || uNode.order > nextNorthBorder)) {
            addConflict(conflicts, u, v);
          }
        });
      }
    });
  }


  function visitLayer(north, south) {
    let prevNorthPos = -1,
      nextNorthPos,
      southPos = 0;

    south.forEach((v, southLookahead) => {
      if (g.node(v).dummy === "border") {
        let predecessors = g.predecessors(v);
        if (predecessors.length) {
          nextNorthPos = g.node(predecessors[0]).order;
          scan(south, southPos, southLookahead, prevNorthPos, nextNorthPos);
          southPos = southLookahead;
          prevNorthPos = nextNorthPos;
        }
      }
      scan(south, southPos, south.length, nextNorthPos, north.length);
    });

    return south;
  }

  layering.length && layering.reduce(visitLayer);

  return conflicts;
}

function findOtherInnerSegmentNode(g, v) {
  if (g.node(v).dummy) {
    return g.predecessors(v).find(u => g.node(u).dummy);
  }
}

function addConflict(conflicts, v, w) {
  if (v > w) {
    let tmp = v;
    v = w;
    w = tmp;
  }

  let conflictsV = conflicts[v];
  if (!conflictsV) {
    conflicts[v] = conflictsV = {};
  }
  conflictsV[w] = true;
}

function hasConflict(conflicts, v, w) {
  if (v > w) {
    let tmp = v;
    v = w;
    w = tmp;
  }
  return !!conflicts[v] && Object.hasOwn(conflicts[v], w);
}

/*
 * Try to align nodes into vertical "blocks" where possible. This algorithm
 * attempts to align a node with one of its median neighbors. If the edge
 * connecting a neighbor is a type-1 conflict then we ignore that possibility.
 * If a previous node has already formed a block with a node after the node
 * we're trying to form a block with, we also ignore that possibility - our
 * blocks would be split in that scenario.
 */
function verticalAlignment(g, layering, conflicts, neighborFn) {
  let root = {},
    align = {},
    pos = {};

  // We cache the position here based on the layering because the graph and
  // layering may be out of sync. The layering matrix is manipulated to
  // generate different extreme alignments.
  layering.forEach(layer => {
    layer.forEach((v, order) => {
      root[v] = v;
      align[v] = v;
      pos[v] = order;
    });
  });

  layering.forEach(layer => {
    let prevIdx = -1;
    layer.forEach(v => {
      let ws = neighborFn(v);
      if (ws.length) {
        ws = ws.sort((a, b) => pos[a] - pos[b]);
        let mp = (ws.length - 1) / 2;
        for (let i = Math.floor(mp), il = Math.ceil(mp); i <= il; ++i) {
          let w = ws[i];
          if (align[v] === v &&
              prevIdx < pos[w] &&
              !hasConflict(conflicts, v, w)) {
            align[w] = v;
            align[v] = root[v] = root[w];
            prevIdx = pos[w];
          }
        }
      }
    });
  });

  return { root: root, align: align };
}

function horizontalCompaction(g, layering, root, align, reverseSep) {
  // This portion of the algorithm differs from BK due to a number of problems.
  // Instead of their algorithm we construct a new block graph and do two
  // sweeps. The first sweep places blocks with the smallest possible
  // coordinates. The second sweep removes unused space by moving blocks to the
  // greatest coordinates without violating separation.
  let xs = {},
    blockG = buildBlockGraph(g, layering, root, reverseSep),
    borderType = reverseSep ? "borderLeft" : "borderRight";

  function iterate(setXsFunc, nextNodesFunc) {
    let stack = blockG.nodes();
    let elem = stack.pop();
    let visited = {};
    while (elem) {
      if (visited[elem]) {
        setXsFunc(elem);
      } else {
        visited[elem] = true;
        stack.push(elem);
        stack = stack.concat(nextNodesFunc(elem));
      }

      elem = stack.pop();
    }
  }

  // First pass, assign smallest coordinates
  function pass1(elem) {
    xs[elem] = blockG.inEdges(elem).reduce((acc, e) => {
      return Math.max(acc, xs[e.v] + blockG.edge(e));
    }, 0);
  }

  // Second pass, assign greatest coordinates
  function pass2(elem) {
    let min = blockG.outEdges(elem).reduce((acc, e) => {
      return Math.min(acc, xs[e.w] - blockG.edge(e));
    }, Number.POSITIVE_INFINITY);

    let node = g.node(elem);
    if (min !== Number.POSITIVE_INFINITY && node.borderType !== borderType) {
      xs[elem] = Math.max(xs[elem], min);
    }
  }

  iterate(pass1, blockG.predecessors.bind(blockG));
  iterate(pass2, blockG.successors.bind(blockG));

  // Assign x coordinates to all nodes
  Object.keys(align).forEach(v => xs[v] = xs[root[v]]);

  return xs;
}


function buildBlockGraph(g, layering, root, reverseSep) {
  let blockGraph = new Graph(),
    graphLabel = g.graph(),
    sepFn = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep);

  layering.forEach(layer => {
    let u;
    layer.forEach(v => {
      let vRoot = root[v];
      blockGraph.setNode(vRoot);
      if (u) {
        var uRoot = root[u],
          prevMax = blockGraph.edge(uRoot, vRoot);
        blockGraph.setEdge(uRoot, vRoot, Math.max(sepFn(g, v, u), prevMax || 0));
      }
      u = v;
    });
  });

  return blockGraph;
}

/*
 * Returns the alignment that has the smallest width of the given alignments.
 */
function findSmallestWidthAlignment(g, xss) {
  return Object.values(xss).reduce((currentMinAndXs, xs) => {
    let max = Number.NEGATIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;

    Object.entries(xs).forEach(([v, x]) => {
      let halfWidth = width(g, v) / 2;

      max = Math.max(x + halfWidth, max);
      min = Math.min(x - halfWidth, min);
    });

    const newMin = max - min;
    if (newMin < currentMinAndXs[0]) {
      currentMinAndXs = [newMin, xs];
    }
    return currentMinAndXs;
  }, [Number.POSITIVE_INFINITY, null])[1];
}

/*
 * Align the coordinates of each of the layout alignments such that
 * left-biased alignments have their minimum coordinate at the same point as
 * the minimum coordinate of the smallest width alignment and right-biased
 * alignments have their maximum coordinate at the same point as the maximum
 * coordinate of the smallest width alignment.
 */
function alignCoordinates(xss, alignTo) {
  let alignToVals = Object.values(alignTo),
    alignToMin = util.applyWithChunking(Math.min, alignToVals),
    alignToMax = util.applyWithChunking(Math.max, alignToVals);

  ["u", "d"].forEach(vert => {
    ["l", "r"].forEach(horiz => {
      let alignment = vert + horiz,
        xs = xss[alignment];

      if (xs === alignTo) return;

      let xsVals = Object.values(xs);
      let delta = alignToMin - util.applyWithChunking(Math.min, xsVals);
      if (horiz !== "l") {
        delta = alignToMax - util.applyWithChunking(Math.max,xsVals);
      }

      if (delta) {
        xss[alignment] = util.mapValues(xs, x => x + delta);
      }
    });
  });
}

function balance(xss, align) {
  return util.mapValues(xss.ul, (num, v) => {
    if (align) {
      return xss[align.toLowerCase()][v];
    } else {
      let xs = Object.values(xss).map(xs => xs[v]).sort((a, b) => a - b);
      return (xs[1] + xs[2]) / 2;
    }
  });
}

function positionX(g) {
  let layering = util.buildLayerMatrix(g);
  let conflicts = Object.assign(
    findType1Conflicts(g, layering),
    findType2Conflicts(g, layering));

  let xss = {};
  let adjustedLayering;
  ["u", "d"].forEach(vert => {
    adjustedLayering = vert === "u" ? layering : Object.values(layering).reverse();
    ["l", "r"].forEach(horiz => {
      if (horiz === "r") {
        adjustedLayering = adjustedLayering.map(inner => {
          return Object.values(inner).reverse();
        });
      }

      let neighborFn = (vert === "u" ? g.predecessors : g.successors).bind(g);
      let align = verticalAlignment(g, adjustedLayering, conflicts, neighborFn);
      let xs = horizontalCompaction(g, adjustedLayering,
        align.root, align.align, horiz === "r");
      if (horiz === "r") {
        xs = util.mapValues(xs, x => -x);
      }
      xss[vert + horiz] = xs;
    });
  });


  let smallestWidth = findSmallestWidthAlignment(g, xss);
  alignCoordinates(xss, smallestWidth);
  return balance(xss, g.graph().align);
}

function sep(nodeSep, edgeSep, reverseSep) {
  return (g, v, w) => {
    let vLabel = g.node(v);
    let wLabel = g.node(w);
    let sum = 0;
    let delta;

    sum += vLabel.width / 2;
    if (Object.hasOwn(vLabel, "labelpos")) {
      switch (vLabel.labelpos.toLowerCase()) {
      case "l": delta = -vLabel.width / 2; break;
      case "r": delta = vLabel.width / 2; break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    sum += (vLabel.dummy ? edgeSep : nodeSep) / 2;
    sum += (wLabel.dummy ? edgeSep : nodeSep) / 2;

    sum += wLabel.width / 2;
    if (Object.hasOwn(wLabel, "labelpos")) {
      switch (wLabel.labelpos.toLowerCase()) {
      case "l": delta = wLabel.width / 2; break;
      case "r": delta = -wLabel.width / 2; break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    return sum;
  };
}

function width(g, v) {
  return g.node(v).width;
}

},{"../util":27,"@dagrejs/graphlib":29}],22:[function(require,module,exports){
"use strict";

let util = require("../util");
let positionX = require("./bk").positionX;

module.exports = position;

function position(g) {
  g = util.asNonCompoundGraph(g);

  positionY(g);
  Object.entries(positionX(g)).forEach(([v, x]) => g.node(v).x = x);
}

function positionY(g) {
  let layering = util.buildLayerMatrix(g);
  let rankSep = g.graph().ranksep;
  let prevY = 0;
  layering.forEach(layer => {
    const maxHeight = layer.reduce((acc, v) => {
      const height = g.node(v).height;
      if (acc > height) {
        return acc;
      } else {
        return height;
      }
    }, 0);
    layer.forEach(v => g.node(v).y = prevY + maxHeight / 2);
    prevY += maxHeight + rankSep;
  });
}


},{"../util":27,"./bk":21}],23:[function(require,module,exports){
"use strict";

var Graph = require("@dagrejs/graphlib").Graph;
var slack = require("./util").slack;

module.exports = feasibleTree;

/*
 * Constructs a spanning tree with tight edges and adjusted the input node's
 * ranks to achieve this. A tight edge is one that is has a length that matches
 * its "minlen" attribute.
 *
 * The basic structure for this function is derived from Gansner, et al., "A
 * Technique for Drawing Directed Graphs."
 *
 * Pre-conditions:
 *
 *    1. Graph must be a DAG.
 *    2. Graph must be connected.
 *    3. Graph must have at least one node.
 *    5. Graph nodes must have been previously assigned a "rank" property that
 *       respects the "minlen" property of incident edges.
 *    6. Graph edges must have a "minlen" property.
 *
 * Post-conditions:
 *
 *    - Graph nodes will have their rank adjusted to ensure that all edges are
 *      tight.
 *
 * Returns a tree (undirected graph) that is constructed using only "tight"
 * edges.
 */
function feasibleTree(g) {
  var t = new Graph({ directed: false });

  // Choose arbitrary node from which to start our tree
  var start = g.nodes()[0];
  var size = g.nodeCount();
  t.setNode(start, {});

  var edge, delta;
  while (tightTree(t, g) < size) {
    edge = findMinSlackEdge(t, g);
    delta = t.hasNode(edge.v) ? slack(g, edge) : -slack(g, edge);
    shiftRanks(t, g, delta);
  }

  return t;
}

/*
 * Finds a maximal tree of tight edges and returns the number of nodes in the
 * tree.
 */
function tightTree(t, g) {
  function dfs(v) {
    g.nodeEdges(v).forEach(e => {
      var edgeV = e.v,
        w = (v === edgeV) ? e.w : edgeV;
      if (!t.hasNode(w) && !slack(g, e)) {
        t.setNode(w, {});
        t.setEdge(v, w, {});
        dfs(w);
      }
    });
  }

  t.nodes().forEach(dfs);
  return t.nodeCount();
}

/*
 * Finds the edge with the smallest slack that is incident on tree and returns
 * it.
 */
function findMinSlackEdge(t, g) {
  const edges = g.edges();

  return edges.reduce((acc, edge) => {
    let edgeSlack = Number.POSITIVE_INFINITY;
    if (t.hasNode(edge.v) !== t.hasNode(edge.w)) {
      edgeSlack = slack(g, edge);
    }

    if (edgeSlack < acc[0]) {
      return [edgeSlack, edge];
    }

    return acc;
  }, [Number.POSITIVE_INFINITY, null])[1];
}

function shiftRanks(t, g, delta) {
  t.nodes().forEach(v => g.node(v).rank += delta);
}

},{"./util":26,"@dagrejs/graphlib":29}],24:[function(require,module,exports){
"use strict";

var rankUtil = require("./util");
var longestPath = rankUtil.longestPath;
var feasibleTree = require("./feasible-tree");
var networkSimplex = require("./network-simplex");

module.exports = rank;

/*
 * Assigns a rank to each node in the input graph that respects the "minlen"
 * constraint specified on edges between nodes.
 *
 * This basic structure is derived from Gansner, et al., "A Technique for
 * Drawing Directed Graphs."
 *
 * Pre-conditions:
 *
 *    1. Graph must be a connected DAG
 *    2. Graph nodes must be objects
 *    3. Graph edges must have "weight" and "minlen" attributes
 *
 * Post-conditions:
 *
 *    1. Graph nodes will have a "rank" attribute based on the results of the
 *       algorithm. Ranks can start at any index (including negative), we'll
 *       fix them up later.
 */
function rank(g) {
  switch(g.graph().ranker) {
  case "network-simplex": networkSimplexRanker(g); break;
  case "tight-tree": tightTreeRanker(g); break;
  case "longest-path": longestPathRanker(g); break;
  default: networkSimplexRanker(g);
  }
}

// A fast and simple ranker, but results are far from optimal.
var longestPathRanker = longestPath;

function tightTreeRanker(g) {
  longestPath(g);
  feasibleTree(g);
}

function networkSimplexRanker(g) {
  networkSimplex(g);
}

},{"./feasible-tree":23,"./network-simplex":25,"./util":26}],25:[function(require,module,exports){
"use strict";

var feasibleTree = require("./feasible-tree");
var slack = require("./util").slack;
var initRank = require("./util").longestPath;
var preorder = require("@dagrejs/graphlib").alg.preorder;
var postorder = require("@dagrejs/graphlib").alg.postorder;
var simplify = require("../util").simplify;

module.exports = networkSimplex;

// Expose some internals for testing purposes
networkSimplex.initLowLimValues = initLowLimValues;
networkSimplex.initCutValues = initCutValues;
networkSimplex.calcCutValue = calcCutValue;
networkSimplex.leaveEdge = leaveEdge;
networkSimplex.enterEdge = enterEdge;
networkSimplex.exchangeEdges = exchangeEdges;

/*
 * The network simplex algorithm assigns ranks to each node in the input graph
 * and iteratively improves the ranking to reduce the length of edges.
 *
 * Preconditions:
 *
 *    1. The input graph must be a DAG.
 *    2. All nodes in the graph must have an object value.
 *    3. All edges in the graph must have "minlen" and "weight" attributes.
 *
 * Postconditions:
 *
 *    1. All nodes in the graph will have an assigned "rank" attribute that has
 *       been optimized by the network simplex algorithm. Ranks start at 0.
 *
 *
 * A rough sketch of the algorithm is as follows:
 *
 *    1. Assign initial ranks to each node. We use the longest path algorithm,
 *       which assigns ranks to the lowest position possible. In general this
 *       leads to very wide bottom ranks and unnecessarily long edges.
 *    2. Construct a feasible tight tree. A tight tree is one such that all
 *       edges in the tree have no slack (difference between length of edge
 *       and minlen for the edge). This by itself greatly improves the assigned
 *       rankings by shorting edges.
 *    3. Iteratively find edges that have negative cut values. Generally a
 *       negative cut value indicates that the edge could be removed and a new
 *       tree edge could be added to produce a more compact graph.
 *
 * Much of the algorithms here are derived from Gansner, et al., "A Technique
 * for Drawing Directed Graphs." The structure of the file roughly follows the
 * structure of the overall algorithm.
 */
function networkSimplex(g) {
  g = simplify(g);
  initRank(g);
  var t = feasibleTree(g);
  initLowLimValues(t);
  initCutValues(t, g);

  var e, f;
  while ((e = leaveEdge(t))) {
    f = enterEdge(t, g, e);
    exchangeEdges(t, g, e, f);
  }
}

/*
 * Initializes cut values for all edges in the tree.
 */
function initCutValues(t, g) {
  var vs = postorder(t, t.nodes());
  vs = vs.slice(0, vs.length - 1);
  vs.forEach(v => assignCutValue(t, g, v));
}

function assignCutValue(t, g, child) {
  var childLab = t.node(child);
  var parent = childLab.parent;
  t.edge(child, parent).cutvalue = calcCutValue(t, g, child);
}

/*
 * Given the tight tree, its graph, and a child in the graph calculate and
 * return the cut value for the edge between the child and its parent.
 */
function calcCutValue(t, g, child) {
  var childLab = t.node(child);
  var parent = childLab.parent;
  // True if the child is on the tail end of the edge in the directed graph
  var childIsTail = true;
  // The graph's view of the tree edge we're inspecting
  var graphEdge = g.edge(child, parent);
  // The accumulated cut value for the edge between this node and its parent
  var cutValue = 0;

  if (!graphEdge) {
    childIsTail = false;
    graphEdge = g.edge(parent, child);
  }

  cutValue = graphEdge.weight;

  g.nodeEdges(child).forEach(e => {
    var isOutEdge = e.v === child,
      other = isOutEdge ? e.w : e.v;

    if (other !== parent) {
      var pointsToHead = isOutEdge === childIsTail,
        otherWeight = g.edge(e).weight;

      cutValue += pointsToHead ? otherWeight : -otherWeight;
      if (isTreeEdge(t, child, other)) {
        var otherCutValue = t.edge(child, other).cutvalue;
        cutValue += pointsToHead ? -otherCutValue : otherCutValue;
      }
    }
  });

  return cutValue;
}

function initLowLimValues(tree, root) {
  if (arguments.length < 2) {
    root = tree.nodes()[0];
  }
  dfsAssignLowLim(tree, {}, 1, root);
}

function dfsAssignLowLim(tree, visited, nextLim, v, parent) {
  var low = nextLim;
  var label = tree.node(v);

  visited[v] = true;
  tree.neighbors(v).forEach(w => {
    if (!Object.hasOwn(visited, w)) {
      nextLim = dfsAssignLowLim(tree, visited, nextLim, w, v);
    }
  });

  label.low = low;
  label.lim = nextLim++;
  if (parent) {
    label.parent = parent;
  } else {
    // TODO should be able to remove this when we incrementally update low lim
    delete label.parent;
  }

  return nextLim;
}

function leaveEdge(tree) {
  return tree.edges().find(e => tree.edge(e).cutvalue < 0);
}

function enterEdge(t, g, edge) {
  var v = edge.v;
  var w = edge.w;

  // For the rest of this function we assume that v is the tail and w is the
  // head, so if we don't have this edge in the graph we should flip it to
  // match the correct orientation.
  if (!g.hasEdge(v, w)) {
    v = edge.w;
    w = edge.v;
  }

  var vLabel = t.node(v);
  var wLabel = t.node(w);
  var tailLabel = vLabel;
  var flip = false;

  // If the root is in the tail of the edge then we need to flip the logic that
  // checks for the head and tail nodes in the candidates function below.
  if (vLabel.lim > wLabel.lim) {
    tailLabel = wLabel;
    flip = true;
  }

  var candidates = g.edges().filter(edge => {
    return flip === isDescendant(t, t.node(edge.v), tailLabel) &&
           flip !== isDescendant(t, t.node(edge.w), tailLabel);
  });

  return candidates.reduce((acc, edge) => {
    if (slack(g, edge) < slack(g, acc)) {
      return edge;
    }

    return acc;
  });
}

function exchangeEdges(t, g, e, f) {
  var v = e.v;
  var w = e.w;
  t.removeEdge(v, w);
  t.setEdge(f.v, f.w, {});
  initLowLimValues(t);
  initCutValues(t, g);
  updateRanks(t, g);
}

function updateRanks(t, g) {
  var root = t.nodes().find(v => !g.node(v).parent);
  var vs = preorder(t, root);
  vs = vs.slice(1);
  vs.forEach(v => {
    var parent = t.node(v).parent,
      edge = g.edge(v, parent),
      flipped = false;

    if (!edge) {
      edge = g.edge(parent, v);
      flipped = true;
    }

    g.node(v).rank = g.node(parent).rank + (flipped ? edge.minlen : -edge.minlen);
  });
}

/*
 * Returns true if the edge is in the tree.
 */
function isTreeEdge(tree, u, v) {
  return tree.hasEdge(u, v);
}

/*
 * Returns true if the specified node is descendant of the root node per the
 * assigned low and lim attributes in the tree.
 */
function isDescendant(tree, vLabel, rootLabel) {
  return rootLabel.low <= vLabel.lim && vLabel.lim <= rootLabel.lim;
}

},{"../util":27,"./feasible-tree":23,"./util":26,"@dagrejs/graphlib":29}],26:[function(require,module,exports){
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

},{"../util":27}],27:[function(require,module,exports){
/* eslint "no-console": off */

"use strict";

let Graph = require("@dagrejs/graphlib").Graph;

module.exports = {
  addBorderNode,
  addDummyNode,
  applyWithChunking,
  asNonCompoundGraph,
  buildLayerMatrix,
  intersectRect,
  mapValues,
  maxRank,
  normalizeRanks,
  notime,
  partition,
  pick,
  predecessorWeights,
  range,
  removeEmptyRanks,
  simplify,
  successorWeights,
  time,
  uniqueId,
  zipObject,
};

/*
 * Adds a dummy node to the graph and return v.
 */
function addDummyNode(g, type, attrs, name) {
  let v;
  do {
    v = uniqueId(name);
  } while (g.hasNode(v));

  attrs.dummy = type;
  g.setNode(v, attrs);
  return v;
}

/*
 * Returns a new graph with only simple edges. Handles aggregation of data
 * associated with multi-edges.
 */
function simplify(g) {
  let simplified = new Graph().setGraph(g.graph());
  g.nodes().forEach(v => simplified.setNode(v, g.node(v)));
  g.edges().forEach(e => {
    let simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlen: 1 };
    let label = g.edge(e);
    simplified.setEdge(e.v, e.w, {
      weight: simpleLabel.weight + label.weight,
      minlen: Math.max(simpleLabel.minlen, label.minlen)
    });
  });
  return simplified;
}

function asNonCompoundGraph(g) {
  let simplified = new Graph({ multigraph: g.isMultigraph() }).setGraph(g.graph());
  g.nodes().forEach(v => {
    if (!g.children(v).length) {
      simplified.setNode(v, g.node(v));
    }
  });
  g.edges().forEach(e => {
    simplified.setEdge(e, g.edge(e));
  });
  return simplified;
}

function successorWeights(g) {
  let weightMap = g.nodes().map(v => {
    let sucs = {};
    g.outEdges(v).forEach(e => {
      sucs[e.w] = (sucs[e.w] || 0) + g.edge(e).weight;
    });
    return sucs;
  });
  return zipObject(g.nodes(), weightMap);
}

function predecessorWeights(g) {
  let weightMap = g.nodes().map(v => {
    let preds = {};
    g.inEdges(v).forEach(e => {
      preds[e.v] = (preds[e.v] || 0) + g.edge(e).weight;
    });
    return preds;
  });
  return zipObject(g.nodes(), weightMap);
}

/*
 * Finds where a line starting at point ({x, y}) would intersect a rectangle
 * ({x, y, width, height}) if it were pointing at the rectangle's center.
 */
function intersectRect(rect, point) {
  let x = rect.x;
  let y = rect.y;

  // Rectangle intersection algorithm from:
  // http://math.stackexchange.com/questions/108113/find-edge-between-two-boxes
  let dx = point.x - x;
  let dy = point.y - y;
  let w = rect.width / 2;
  let h = rect.height / 2;

  if (!dx && !dy) {
    throw new Error("Not possible to find intersection inside of the rectangle");
  }

  let sx, sy;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    // Intersection is top or bottom of rect.
    if (dy < 0) {
      h = -h;
    }
    sx = h * dx / dy;
    sy = h;
  } else {
    // Intersection is left or right of rect.
    if (dx < 0) {
      w = -w;
    }
    sx = w;
    sy = w * dy / dx;
  }

  return { x: x + sx, y: y + sy };
}

/*
 * Given a DAG with each node assigned "rank" and "order" properties, this
 * function will produce a matrix with the ids of each node.
 */
function buildLayerMatrix(g) {
  let layering = range(maxRank(g) + 1).map(() => []);
  g.nodes().forEach(v => {
    let node = g.node(v);
    let rank = node.rank;
    if (rank !== undefined) {
      layering[rank][node.order] = v;
    }
  });
  return layering;
}

/*
 * Adjusts the ranks for all nodes in the graph such that all nodes v have
 * rank(v) >= 0 and at least one node w has rank(w) = 0.
 */
function normalizeRanks(g) {
  let nodeRanks = g.nodes().map(v => {
    let rank = g.node(v).rank;
    if (rank === undefined) {
      return Number.MAX_VALUE;
    }

    return rank;
  });
  let min = applyWithChunking(Math.min, nodeRanks);
  g.nodes().forEach(v => {
    let node = g.node(v);
    if (Object.hasOwn(node, "rank")) {
      node.rank -= min;
    }
  });
}

function removeEmptyRanks(g) {
  // Ranks may not start at 0, so we need to offset them
  let nodeRanks = g.nodes().map(v => g.node(v).rank);
  let offset = applyWithChunking(Math.min, nodeRanks);

  let layers = [];
  g.nodes().forEach(v => {
    let rank = g.node(v).rank - offset;
    if (!layers[rank]) {
      layers[rank] = [];
    }
    layers[rank].push(v);
  });

  let delta = 0;
  let nodeRankFactor = g.graph().nodeRankFactor;
  Array.from(layers).forEach((vs, i) => {
    if (vs === undefined && i % nodeRankFactor !== 0) {
      --delta;
    } else if (vs !== undefined && delta) {
      vs.forEach(v => g.node(v).rank += delta);
    }
  });
}

function addBorderNode(g, prefix, rank, order) {
  let node = {
    width: 0,
    height: 0
  };
  if (arguments.length >= 4) {
    node.rank = rank;
    node.order = order;
  }
  return addDummyNode(g, "border", node, prefix);
}

function splitToChunks(array, chunkSize = CHUNKING_THRESHOLD) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  return chunks;
}

const CHUNKING_THRESHOLD = 65535;

function applyWithChunking(fn, argsArray) {
  if(argsArray.length > CHUNKING_THRESHOLD) {
    const chunks = splitToChunks(argsArray);
    return fn.apply(null, chunks.map(chunk => fn.apply(null, chunk)));
  } else {
    return fn.apply(null, argsArray);
  }
}

function maxRank(g) {
  const nodes = g.nodes();
  const nodeRanks = nodes.map(v => {
    let rank = g.node(v).rank;
    if (rank === undefined) {
      return Number.MIN_VALUE;
    }
    return rank;
  });

  return applyWithChunking(Math.max, nodeRanks);
}

/*
 * Partition a collection into two groups: `lhs` and `rhs`. If the supplied
 * function returns true for an entry it goes into `lhs`. Otherwise it goes
 * into `rhs.
 */
function partition(collection, fn) {
  let result = { lhs: [], rhs: [] };
  collection.forEach(value => {
    if (fn(value)) {
      result.lhs.push(value);
    } else {
      result.rhs.push(value);
    }
  });
  return result;
}

/*
 * Returns a new function that wraps `fn` with a timer. The wrapper logs the
 * time it takes to execute the function.
 */
function time(name, fn) {
  let start = Date.now();
  try {
    return fn();
  } finally {
    console.log(name + " time: " + (Date.now() - start) + "ms");
  }
}

function notime(name, fn) {
  return fn();
}

let idCounter = 0;
function uniqueId(prefix) {
  var id = ++idCounter;
  return toString(prefix) + id;
}

function range(start, limit, step = 1) {
  if (limit == null) {
    limit = start;
    start = 0;
  }

  let endCon = (i) => i < limit;
  if (step < 0) {
    endCon = (i) => limit < i;
  }

  const range = [];
  for (let i = start; endCon(i); i += step) {
    range.push(i);
  }

  return range;
}

function pick(source, keys) {
  const dest = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      dest[key] = source[key];
    }
  }

  return dest;
}

function mapValues(obj, funcOrProp) {
  let func = funcOrProp;
  if (typeof funcOrProp === 'string') {
    func = (val) => val[funcOrProp];
  }

  return Object.entries(obj).reduce((acc, [k, v]) => {
    acc[k] = func(v, k);
    return acc;
  }, {});
}

function zipObject(props, values) {
  return props.reduce((acc, key, i) => {
    acc[key] = values[i];
    return acc;
  }, {});
}

},{"@dagrejs/graphlib":29}],28:[function(require,module,exports){
module.exports = "1.1.4";

},{}],29:[function(require,module,exports){
/**
 * Copyright (c) 2014, Chris Pettitt
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var lib = require("./lib");

module.exports = {
  Graph: lib.Graph,
  json: require("./lib/json"),
  alg: require("./lib/alg"),
  version: lib.version
};

},{"./lib":45,"./lib/alg":36,"./lib/json":46}],30:[function(require,module,exports){
module.exports = components;

function components(g) {
  var visited = {};
  var cmpts = [];
  var cmpt;

  function dfs(v) {
    if (Object.hasOwn(visited, v)) return;
    visited[v] = true;
    cmpt.push(v);
    g.successors(v).forEach(dfs);
    g.predecessors(v).forEach(dfs);
  }

  g.nodes().forEach(function(v) {
    cmpt = [];
    dfs(v);
    if (cmpt.length) {
      cmpts.push(cmpt);
    }
  });

  return cmpts;
}

},{}],31:[function(require,module,exports){
module.exports = dfs;

/*
 * A helper that preforms a pre- or post-order traversal on the input graph
 * and returns the nodes in the order they were visited. If the graph is
 * undirected then this algorithm will navigate using neighbors. If the graph
 * is directed then this algorithm will navigate using successors.
 *
 * If the order is not "post", it will be treated as "pre".
 */
function dfs(g, vs, order) {
  if (!Array.isArray(vs)) {
    vs = [vs];
  }

  var navigation = g.isDirected() ? v => g.successors(v) : v => g.neighbors(v);
  var orderFunc = order === "post" ? postOrderDfs : preOrderDfs;

  var acc = [];
  var visited = {};
  vs.forEach(v => {
    if (!g.hasNode(v)) {
      throw new Error("Graph does not have node: " + v);
    }

    orderFunc(v, navigation, visited, acc);
  });

  return acc;
}

function postOrderDfs(v, navigation, visited, acc) {
  var stack = [[v, false]];
  while (stack.length > 0) {
    var curr = stack.pop();
    if (curr[1]) {
      acc.push(curr[0]);
    } else {
      if (!Object.hasOwn(visited, curr[0])) {
        visited[curr[0]] = true;
        stack.push([curr[0], true]);
        forEachRight(navigation(curr[0]), w => stack.push([w, false]));
      }
    }
  }
}

function preOrderDfs(v, navigation, visited, acc) {
  var stack = [v];
  while (stack.length > 0) {
    var curr = stack.pop();
    if (!Object.hasOwn(visited, curr)) {
      visited[curr] = true;
      acc.push(curr);
      forEachRight(navigation(curr), w => stack.push(w));
    }
  }
}

function forEachRight(array, iteratee) {
  var length = array.length;
  while (length--) {
    iteratee(array[length], length, array);
  }

  return array;
}

},{}],32:[function(require,module,exports){
var dijkstra = require("./dijkstra");

module.exports = dijkstraAll;

function dijkstraAll(g, weightFunc, edgeFunc) {
  return g.nodes().reduce(function(acc, v) {
    acc[v] = dijkstra(g, v, weightFunc, edgeFunc);
    return acc;
  }, {});
}

},{"./dijkstra":33}],33:[function(require,module,exports){
var PriorityQueue = require("../data/priority-queue");

module.exports = dijkstra;

var DEFAULT_WEIGHT_FUNC = () => 1;

function dijkstra(g, source, weightFn, edgeFn) {
  return runDijkstra(g, String(source),
    weightFn || DEFAULT_WEIGHT_FUNC,
    edgeFn || function(v) { return g.outEdges(v); });
}

function runDijkstra(g, source, weightFn, edgeFn) {
  var results = {};
  var pq = new PriorityQueue();
  var v, vEntry;

  var updateNeighbors = function(edge) {
    var w = edge.v !== v ? edge.v : edge.w;
    var wEntry = results[w];
    var weight = weightFn(edge);
    var distance = vEntry.distance + weight;

    if (weight < 0) {
      throw new Error("dijkstra does not allow negative edge weights. " +
                      "Bad edge: " + edge + " Weight: " + weight);
    }

    if (distance < wEntry.distance) {
      wEntry.distance = distance;
      wEntry.predecessor = v;
      pq.decrease(w, distance);
    }
  };

  g.nodes().forEach(function(v) {
    var distance = v === source ? 0 : Number.POSITIVE_INFINITY;
    results[v] = { distance: distance };
    pq.add(v, distance);
  });

  while (pq.size() > 0) {
    v = pq.removeMin();
    vEntry = results[v];
    if (vEntry.distance === Number.POSITIVE_INFINITY) {
      break;
    }

    edgeFn(v).forEach(updateNeighbors);
  }

  return results;
}

},{"../data/priority-queue":43}],34:[function(require,module,exports){
var tarjan = require("./tarjan");

module.exports = findCycles;

function findCycles(g) {
  return tarjan(g).filter(function(cmpt) {
    return cmpt.length > 1 || (cmpt.length === 1 && g.hasEdge(cmpt[0], cmpt[0]));
  });
}

},{"./tarjan":41}],35:[function(require,module,exports){
module.exports = floydWarshall;

var DEFAULT_WEIGHT_FUNC = () => 1;

function floydWarshall(g, weightFn, edgeFn) {
  return runFloydWarshall(g,
    weightFn || DEFAULT_WEIGHT_FUNC,
    edgeFn || function(v) { return g.outEdges(v); });
}

function runFloydWarshall(g, weightFn, edgeFn) {
  var results = {};
  var nodes = g.nodes();

  nodes.forEach(function(v) {
    results[v] = {};
    results[v][v] = { distance: 0 };
    nodes.forEach(function(w) {
      if (v !== w) {
        results[v][w] = { distance: Number.POSITIVE_INFINITY };
      }
    });
    edgeFn(v).forEach(function(edge) {
      var w = edge.v === v ? edge.w : edge.v;
      var d = weightFn(edge);
      results[v][w] = { distance: d, predecessor: v };
    });
  });

  nodes.forEach(function(k) {
    var rowK = results[k];
    nodes.forEach(function(i) {
      var rowI = results[i];
      nodes.forEach(function(j) {
        var ik = rowI[k];
        var kj = rowK[j];
        var ij = rowI[j];
        var altDistance = ik.distance + kj.distance;
        if (altDistance < ij.distance) {
          ij.distance = altDistance;
          ij.predecessor = kj.predecessor;
        }
      });
    });
  });

  return results;
}

},{}],36:[function(require,module,exports){
module.exports = {
  components: require("./components"),
  dijkstra: require("./dijkstra"),
  dijkstraAll: require("./dijkstra-all"),
  findCycles: require("./find-cycles"),
  floydWarshall: require("./floyd-warshall"),
  isAcyclic: require("./is-acyclic"),
  postorder: require("./postorder"),
  preorder: require("./preorder"),
  prim: require("./prim"),
  tarjan: require("./tarjan"),
  topsort: require("./topsort")
};

},{"./components":30,"./dijkstra":33,"./dijkstra-all":32,"./find-cycles":34,"./floyd-warshall":35,"./is-acyclic":37,"./postorder":38,"./preorder":39,"./prim":40,"./tarjan":41,"./topsort":42}],37:[function(require,module,exports){
var topsort = require("./topsort");

module.exports = isAcyclic;

function isAcyclic(g) {
  try {
    topsort(g);
  } catch (e) {
    if (e instanceof topsort.CycleException) {
      return false;
    }
    throw e;
  }
  return true;
}

},{"./topsort":42}],38:[function(require,module,exports){
var dfs = require("./dfs");

module.exports = postorder;

function postorder(g, vs) {
  return dfs(g, vs, "post");
}

},{"./dfs":31}],39:[function(require,module,exports){
var dfs = require("./dfs");

module.exports = preorder;

function preorder(g, vs) {
  return dfs(g, vs, "pre");
}

},{"./dfs":31}],40:[function(require,module,exports){
var Graph = require("../graph");
var PriorityQueue = require("../data/priority-queue");

module.exports = prim;

function prim(g, weightFunc) {
  var result = new Graph();
  var parents = {};
  var pq = new PriorityQueue();
  var v;

  function updateNeighbors(edge) {
    var w = edge.v === v ? edge.w : edge.v;
    var pri = pq.priority(w);
    if (pri !== undefined) {
      var edgeWeight = weightFunc(edge);
      if (edgeWeight < pri) {
        parents[w] = v;
        pq.decrease(w, edgeWeight);
      }
    }
  }

  if (g.nodeCount() === 0) {
    return result;
  }

  g.nodes().forEach(function(v) {
    pq.add(v, Number.POSITIVE_INFINITY);
    result.setNode(v);
  });

  // Start from an arbitrary node
  pq.decrease(g.nodes()[0], 0);

  var init = false;
  while (pq.size() > 0) {
    v = pq.removeMin();
    if (Object.hasOwn(parents, v)) {
      result.setEdge(v, parents[v]);
    } else if (init) {
      throw new Error("Input graph is not connected: " + g);
    } else {
      init = true;
    }

    g.nodeEdges(v).forEach(updateNeighbors);
  }

  return result;
}

},{"../data/priority-queue":43,"../graph":44}],41:[function(require,module,exports){
module.exports = tarjan;

function tarjan(g) {
  var index = 0;
  var stack = [];
  var visited = {}; // node id -> { onStack, lowlink, index }
  var results = [];

  function dfs(v) {
    var entry = visited[v] = {
      onStack: true,
      lowlink: index,
      index: index++
    };
    stack.push(v);

    g.successors(v).forEach(function(w) {
      if (!Object.hasOwn(visited, w)) {
        dfs(w);
        entry.lowlink = Math.min(entry.lowlink, visited[w].lowlink);
      } else if (visited[w].onStack) {
        entry.lowlink = Math.min(entry.lowlink, visited[w].index);
      }
    });

    if (entry.lowlink === entry.index) {
      var cmpt = [];
      var w;
      do {
        w = stack.pop();
        visited[w].onStack = false;
        cmpt.push(w);
      } while (v !== w);
      results.push(cmpt);
    }
  }

  g.nodes().forEach(function(v) {
    if (!Object.hasOwn(visited, v)) {
      dfs(v);
    }
  });

  return results;
}

},{}],42:[function(require,module,exports){
function topsort(g) {
  var visited = {};
  var stack = {};
  var results = [];

  function visit(node) {
    if (Object.hasOwn(stack, node)) {
      throw new CycleException();
    }

    if (!Object.hasOwn(visited, node)) {
      stack[node] = true;
      visited[node] = true;
      g.predecessors(node).forEach(visit);
      delete stack[node];
      results.push(node);
    }
  }

  g.sinks().forEach(visit);

  if (Object.keys(visited).length !== g.nodeCount()) {
    throw new CycleException();
  }

  return results;
}

class CycleException extends Error {
  constructor() {
    super(...arguments);
  }
}

module.exports = topsort;
topsort.CycleException = CycleException;

},{}],43:[function(require,module,exports){
/**
 * A min-priority queue data structure. This algorithm is derived from Cormen,
 * et al., "Introduction to Algorithms". The basic idea of a min-priority
 * queue is that you can efficiently (in O(1) time) get the smallest key in
 * the queue. Adding and removing elements takes O(log n) time. A key can
 * have its priority decreased in O(log n) time.
 */
class PriorityQueue {
  _arr = [];
  _keyIndices = {};

  /**
   * Returns the number of elements in the queue. Takes `O(1)` time.
   */
  size() {
    return this._arr.length;
  }

  /**
   * Returns the keys that are in the queue. Takes `O(n)` time.
   */
  keys() {
    return this._arr.map(function(x) { return x.key; });
  }

  /**
   * Returns `true` if **key** is in the queue and `false` if not.
   */
  has(key) {
    return Object.hasOwn(this._keyIndices, key);
  }

  /**
   * Returns the priority for **key**. If **key** is not present in the queue
   * then this function returns `undefined`. Takes `O(1)` time.
   *
   * @param {Object} key
   */
  priority(key) {
    var index = this._keyIndices[key];
    if (index !== undefined) {
      return this._arr[index].priority;
    }
  }

  /**
   * Returns the key for the minimum element in this queue. If the queue is
   * empty this function throws an Error. Takes `O(1)` time.
   */
  min() {
    if (this.size() === 0) {
      throw new Error("Queue underflow");
    }
    return this._arr[0].key;
  }

  /**
   * Inserts a new key into the priority queue. If the key already exists in
   * the queue this function returns `false`; otherwise it will return `true`.
   * Takes `O(n)` time.
   *
   * @param {Object} key the key to add
   * @param {Number} priority the initial priority for the key
   */
  add(key, priority) {
    var keyIndices = this._keyIndices;
    key = String(key);
    if (!Object.hasOwn(keyIndices, key)) {
      var arr = this._arr;
      var index = arr.length;
      keyIndices[key] = index;
      arr.push({key: key, priority: priority});
      this._decrease(index);
      return true;
    }
    return false;
  }

  /**
   * Removes and returns the smallest key in the queue. Takes `O(log n)` time.
   */
  removeMin() {
    this._swap(0, this._arr.length - 1);
    var min = this._arr.pop();
    delete this._keyIndices[min.key];
    this._heapify(0);
    return min.key;
  }

  /**
   * Decreases the priority for **key** to **priority**. If the new priority is
   * greater than the previous priority, this function will throw an Error.
   *
   * @param {Object} key the key for which to raise priority
   * @param {Number} priority the new priority for the key
   */
  decrease(key, priority) {
    var index = this._keyIndices[key];
    if (priority > this._arr[index].priority) {
      throw new Error("New priority is greater than current priority. " +
          "Key: " + key + " Old: " + this._arr[index].priority + " New: " + priority);
    }
    this._arr[index].priority = priority;
    this._decrease(index);
  }

  _heapify(i) {
    var arr = this._arr;
    var l = 2 * i;
    var r = l + 1;
    var largest = i;
    if (l < arr.length) {
      largest = arr[l].priority < arr[largest].priority ? l : largest;
      if (r < arr.length) {
        largest = arr[r].priority < arr[largest].priority ? r : largest;
      }
      if (largest !== i) {
        this._swap(i, largest);
        this._heapify(largest);
      }
    }
  }

  _decrease(index) {
    var arr = this._arr;
    var priority = arr[index].priority;
    var parent;
    while (index !== 0) {
      parent = index >> 1;
      if (arr[parent].priority < priority) {
        break;
      }
      this._swap(index, parent);
      index = parent;
    }
  }

  _swap(i, j) {
    var arr = this._arr;
    var keyIndices = this._keyIndices;
    var origArrI = arr[i];
    var origArrJ = arr[j];
    arr[i] = origArrJ;
    arr[j] = origArrI;
    keyIndices[origArrJ.key] = i;
    keyIndices[origArrI.key] = j;
  }
}

module.exports = PriorityQueue;

},{}],44:[function(require,module,exports){
"use strict";

var DEFAULT_EDGE_NAME = "\x00";
var GRAPH_NODE = "\x00";
var EDGE_KEY_DELIM = "\x01";

// Implementation notes:
//
//  * Node id query functions should return string ids for the nodes
//  * Edge id query functions should return an "edgeObj", edge object, that is
//    composed of enough information to uniquely identify an edge: {v, w, name}.
//  * Internally we use an "edgeId", a stringified form of the edgeObj, to
//    reference edges. This is because we need a performant way to look these
//    edges up and, object properties, which have string keys, are the closest
//    we're going to get to a performant hashtable in JavaScript.

class Graph {
  _isDirected = true;
  _isMultigraph = false;
  _isCompound = false;

  // Label for the graph itself
  _label;

  // Defaults to be set when creating a new node
  _defaultNodeLabelFn = () => undefined;

  // Defaults to be set when creating a new edge
  _defaultEdgeLabelFn = () => undefined;

  // v -> label
  _nodes = {};

  // v -> edgeObj
  _in = {};

  // u -> v -> Number
  _preds = {};

  // v -> edgeObj
  _out = {};

  // v -> w -> Number
  _sucs = {};

  // e -> edgeObj
  _edgeObjs = {};

  // e -> label
  _edgeLabels = {};

  /* Number of nodes in the graph. Should only be changed by the implementation. */
  _nodeCount = 0;

  /* Number of edges in the graph. Should only be changed by the implementation. */
  _edgeCount = 0;

  _parent;

  _children;

  constructor(opts) {
    if (opts) {
      this._isDirected = Object.hasOwn(opts, "directed") ? opts.directed : true;
      this._isMultigraph = Object.hasOwn(opts, "multigraph") ? opts.multigraph : false;
      this._isCompound = Object.hasOwn(opts, "compound") ? opts.compound : false;
    }

    if (this._isCompound) {
      // v -> parent
      this._parent = {};

      // v -> children
      this._children = {};
      this._children[GRAPH_NODE] = {};
    }
  }

  /* === Graph functions ========= */

  /**
   * Whether graph was created with 'directed' flag set to true or not.
   */
  isDirected() {
    return this._isDirected;
  }

  /**
   * Whether graph was created with 'multigraph' flag set to true or not.
   */
  isMultigraph() {
    return this._isMultigraph;
  }

  /**
   * Whether graph was created with 'compound' flag set to true or not.
   */
  isCompound() {
    return this._isCompound;
  }

  /**
   * Sets the label of the graph.
   */
  setGraph(label) {
    this._label = label;
    return this;
  }

  /**
   * Gets the graph label.
   */
  graph() {
    return this._label;
  }


  /* === Node functions ========== */

  /**
   * Sets the default node label. If newDefault is a function, it will be
   * invoked ach time when setting a label for a node. Otherwise, this label
   * will be assigned as default label in case if no label was specified while
   * setting a node.
   * Complexity: O(1).
   */
  setDefaultNodeLabel(newDefault) {
    this._defaultNodeLabelFn = newDefault;
    if (typeof newDefault !== 'function') {
      this._defaultNodeLabelFn = () => newDefault;
    }

    return this;
  }

  /**
   * Gets the number of nodes in the graph.
   * Complexity: O(1).
   */
  nodeCount() {
    return this._nodeCount;
  }

  /**
   * Gets all nodes of the graph. Note, the in case of compound graph subnodes are
   * not included in list.
   * Complexity: O(1).
   */
  nodes() {
    return Object.keys(this._nodes);
  }

  /**
   * Gets list of nodes without in-edges.
   * Complexity: O(|V|).
   */
  sources() {
    var self = this;
    return this.nodes().filter(v => Object.keys(self._in[v]).length === 0);
  }

  /**
   * Gets list of nodes without out-edges.
   * Complexity: O(|V|).
   */
  sinks() {
    var self = this;
    return this.nodes().filter(v => Object.keys(self._out[v]).length === 0);
  }

  /**
   * Invokes setNode method for each node in names list.
   * Complexity: O(|names|).
   */
  setNodes(vs, value) {
    var args = arguments;
    var self = this;
    vs.forEach(function(v) {
      if (args.length > 1) {
        self.setNode(v, value);
      } else {
        self.setNode(v);
      }
    });
    return this;
  }

  /**
   * Creates or updates the value for the node v in the graph. If label is supplied
   * it is set as the value for the node. If label is not supplied and the node was
   * created by this call then the default node label will be assigned.
   * Complexity: O(1).
   */
  setNode(v, value) {
    if (Object.hasOwn(this._nodes, v)) {
      if (arguments.length > 1) {
        this._nodes[v] = value;
      }
      return this;
    }

    this._nodes[v] = arguments.length > 1 ? value : this._defaultNodeLabelFn(v);
    if (this._isCompound) {
      this._parent[v] = GRAPH_NODE;
      this._children[v] = {};
      this._children[GRAPH_NODE][v] = true;
    }
    this._in[v] = {};
    this._preds[v] = {};
    this._out[v] = {};
    this._sucs[v] = {};
    ++this._nodeCount;
    return this;
  }

  /**
   * Gets the label of node with specified name.
   * Complexity: O(|V|).
   */
  node(v) {
    return this._nodes[v];
  }

  /**
   * Detects whether graph has a node with specified name or not.
   */
  hasNode(v) {
    return Object.hasOwn(this._nodes, v);
  }

  /**
   * Remove the node with the name from the graph or do nothing if the node is not in
   * the graph. If the node was removed this function also removes any incident
   * edges.
   * Complexity: O(1).
   */
  removeNode(v) {
    var self = this;
    if (Object.hasOwn(this._nodes, v)) {
      var removeEdge = e => self.removeEdge(self._edgeObjs[e]);
      delete this._nodes[v];
      if (this._isCompound) {
        this._removeFromParentsChildList(v);
        delete this._parent[v];
        this.children(v).forEach(function(child) {
          self.setParent(child);
        });
        delete this._children[v];
      }
      Object.keys(this._in[v]).forEach(removeEdge);
      delete this._in[v];
      delete this._preds[v];
      Object.keys(this._out[v]).forEach(removeEdge);
      delete this._out[v];
      delete this._sucs[v];
      --this._nodeCount;
    }
    return this;
  }

  /**
   * Sets node p as a parent for node v if it is defined, or removes the
   * parent for v if p is undefined. Method throws an exception in case of
   * invoking it in context of noncompound graph.
   * Average-case complexity: O(1).
   */
  setParent(v, parent) {
    if (!this._isCompound) {
      throw new Error("Cannot set parent in a non-compound graph");
    }

    if (parent === undefined) {
      parent = GRAPH_NODE;
    } else {
      // Coerce parent to string
      parent += "";
      for (var ancestor = parent; ancestor !== undefined; ancestor = this.parent(ancestor)) {
        if (ancestor === v) {
          throw new Error("Setting " + parent+ " as parent of " + v +
              " would create a cycle");
        }
      }

      this.setNode(parent);
    }

    this.setNode(v);
    this._removeFromParentsChildList(v);
    this._parent[v] = parent;
    this._children[parent][v] = true;
    return this;
  }

  _removeFromParentsChildList(v) {
    delete this._children[this._parent[v]][v];
  }

  /**
   * Gets parent node for node v.
   * Complexity: O(1).
   */
  parent(v) {
    if (this._isCompound) {
      var parent = this._parent[v];
      if (parent !== GRAPH_NODE) {
        return parent;
      }
    }
  }

  /**
   * Gets list of direct children of node v.
   * Complexity: O(1).
   */
  children(v = GRAPH_NODE) {
    if (this._isCompound) {
      var children = this._children[v];
      if (children) {
        return Object.keys(children);
      }
    } else if (v === GRAPH_NODE) {
      return this.nodes();
    } else if (this.hasNode(v)) {
      return [];
    }
  }

  /**
   * Return all nodes that are predecessors of the specified node or undefined if node v is not in
   * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
   * Complexity: O(|V|).
   */
  predecessors(v) {
    var predsV = this._preds[v];
    if (predsV) {
      return Object.keys(predsV);
    }
  }

  /**
   * Return all nodes that are successors of the specified node or undefined if node v is not in
   * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
   * Complexity: O(|V|).
   */
  successors(v) {
    var sucsV = this._sucs[v];
    if (sucsV) {
      return Object.keys(sucsV);
    }
  }

  /**
   * Return all nodes that are predecessors or successors of the specified node or undefined if
   * node v is not in the graph.
   * Complexity: O(|V|).
   */
  neighbors(v) {
    var preds = this.predecessors(v);
    if (preds) {
      const union = new Set(preds);
      for (var succ of this.successors(v)) {
        union.add(succ);
      }

      return Array.from(union.values());
    }
  }

  isLeaf(v) {
    var neighbors;
    if (this.isDirected()) {
      neighbors = this.successors(v);
    } else {
      neighbors = this.neighbors(v);
    }
    return neighbors.length === 0;
  }

  /**
   * Creates new graph with nodes filtered via filter. Edges incident to rejected node
   * are also removed. In case of compound graph, if parent is rejected by filter,
   * than all its children are rejected too.
   * Average-case complexity: O(|E|+|V|).
   */
  filterNodes(filter) {
    var copy = new this.constructor({
      directed: this._isDirected,
      multigraph: this._isMultigraph,
      compound: this._isCompound
    });

    copy.setGraph(this.graph());

    var self = this;
    Object.entries(this._nodes).forEach(function([v, value]) {
      if (filter(v)) {
        copy.setNode(v, value);
      }
    });

    Object.values(this._edgeObjs).forEach(function(e) {
      if (copy.hasNode(e.v) && copy.hasNode(e.w)) {
        copy.setEdge(e, self.edge(e));
      }
    });

    var parents = {};
    function findParent(v) {
      var parent = self.parent(v);
      if (parent === undefined || copy.hasNode(parent)) {
        parents[v] = parent;
        return parent;
      } else if (parent in parents) {
        return parents[parent];
      } else {
        return findParent(parent);
      }
    }

    if (this._isCompound) {
      copy.nodes().forEach(v => copy.setParent(v, findParent(v)));
    }

    return copy;
  }

  /* === Edge functions ========== */

  /**
   * Sets the default edge label or factory function. This label will be
   * assigned as default label in case if no label was specified while setting
   * an edge or this function will be invoked each time when setting an edge
   * with no label specified and returned value * will be used as a label for edge.
   * Complexity: O(1).
   */
  setDefaultEdgeLabel(newDefault) {
    this._defaultEdgeLabelFn = newDefault;
    if (typeof newDefault !== 'function') {
      this._defaultEdgeLabelFn = () => newDefault;
    }

    return this;
  }

  /**
   * Gets the number of edges in the graph.
   * Complexity: O(1).
   */
  edgeCount() {
    return this._edgeCount;
  }

  /**
   * Gets edges of the graph. In case of compound graph subgraphs are not considered.
   * Complexity: O(|E|).
   */
  edges() {
    return Object.values(this._edgeObjs);
  }

  /**
   * Establish an edges path over the nodes in nodes list. If some edge is already
   * exists, it will update its label, otherwise it will create an edge between pair
   * of nodes with label provided or default label if no label provided.
   * Complexity: O(|nodes|).
   */
  setPath(vs, value) {
    var self = this;
    var args = arguments;
    vs.reduce(function(v, w) {
      if (args.length > 1) {
        self.setEdge(v, w, value);
      } else {
        self.setEdge(v, w);
      }
      return w;
    });
    return this;
  }

  /**
   * Creates or updates the label for the edge (v, w) with the optionally supplied
   * name. If label is supplied it is set as the value for the edge. If label is not
   * supplied and the edge was created by this call then the default edge label will
   * be assigned. The name parameter is only useful with multigraphs.
   */
  setEdge() {
    var v, w, name, value;
    var valueSpecified = false;
    var arg0 = arguments[0];

    if (typeof arg0 === "object" && arg0 !== null && "v" in arg0) {
      v = arg0.v;
      w = arg0.w;
      name = arg0.name;
      if (arguments.length === 2) {
        value = arguments[1];
        valueSpecified = true;
      }
    } else {
      v = arg0;
      w = arguments[1];
      name = arguments[3];
      if (arguments.length > 2) {
        value = arguments[2];
        valueSpecified = true;
      }
    }

    v = "" + v;
    w = "" + w;
    if (name !== undefined) {
      name = "" + name;
    }

    var e = edgeArgsToId(this._isDirected, v, w, name);
    if (Object.hasOwn(this._edgeLabels, e)) {
      if (valueSpecified) {
        this._edgeLabels[e] = value;
      }
      return this;
    }

    if (name !== undefined && !this._isMultigraph) {
      throw new Error("Cannot set a named edge when isMultigraph = false");
    }

    // It didn't exist, so we need to create it.
    // First ensure the nodes exist.
    this.setNode(v);
    this.setNode(w);

    this._edgeLabels[e] = valueSpecified ? value : this._defaultEdgeLabelFn(v, w, name);

    var edgeObj = edgeArgsToObj(this._isDirected, v, w, name);
    // Ensure we add undirected edges in a consistent way.
    v = edgeObj.v;
    w = edgeObj.w;

    Object.freeze(edgeObj);
    this._edgeObjs[e] = edgeObj;
    incrementOrInitEntry(this._preds[w], v);
    incrementOrInitEntry(this._sucs[v], w);
    this._in[w][e] = edgeObj;
    this._out[v][e] = edgeObj;
    this._edgeCount++;
    return this;
  }

  /**
   * Gets the label for the specified edge.
   * Complexity: O(1).
   */
  edge(v, w, name) {
    var e = (arguments.length === 1
      ? edgeObjToId(this._isDirected, arguments[0])
      : edgeArgsToId(this._isDirected, v, w, name));
    return this._edgeLabels[e];
  }

  /**
   * Gets the label for the specified edge and converts it to an object.
   * Complexity: O(1)
   */
  edgeAsObj() {
    const edge = this.edge(...arguments);
    if (typeof edge !== "object") {
      return {label: edge};
    }

    return edge;
  }

  /**
   * Detects whether the graph contains specified edge or not. No subgraphs are considered.
   * Complexity: O(1).
   */
  hasEdge(v, w, name) {
    var e = (arguments.length === 1
      ? edgeObjToId(this._isDirected, arguments[0])
      : edgeArgsToId(this._isDirected, v, w, name));
    return Object.hasOwn(this._edgeLabels, e);
  }

  /**
   * Removes the specified edge from the graph. No subgraphs are considered.
   * Complexity: O(1).
   */
  removeEdge(v, w, name) {
    var e = (arguments.length === 1
      ? edgeObjToId(this._isDirected, arguments[0])
      : edgeArgsToId(this._isDirected, v, w, name));
    var edge = this._edgeObjs[e];
    if (edge) {
      v = edge.v;
      w = edge.w;
      delete this._edgeLabels[e];
      delete this._edgeObjs[e];
      decrementOrRemoveEntry(this._preds[w], v);
      decrementOrRemoveEntry(this._sucs[v], w);
      delete this._in[w][e];
      delete this._out[v][e];
      this._edgeCount--;
    }
    return this;
  }

  /**
   * Return all edges that point to the node v. Optionally filters those edges down to just those
   * coming from node u. Behavior is undefined for undirected graphs - use nodeEdges instead.
   * Complexity: O(|E|).
   */
  inEdges(v, u) {
    var inV = this._in[v];
    if (inV) {
      var edges = Object.values(inV);
      if (!u) {
        return edges;
      }
      return edges.filter(edge => edge.v === u);
    }
  }

  /**
   * Return all edges that are pointed at by node v. Optionally filters those edges down to just
   * those point to w. Behavior is undefined for undirected graphs - use nodeEdges instead.
   * Complexity: O(|E|).
   */
  outEdges(v, w) {
    var outV = this._out[v];
    if (outV) {
      var edges = Object.values(outV);
      if (!w) {
        return edges;
      }
      return edges.filter(edge => edge.w === w);
    }
  }

  /**
   * Returns all edges to or from node v regardless of direction. Optionally filters those edges
   * down to just those between nodes v and w regardless of direction.
   * Complexity: O(|E|).
   */
  nodeEdges(v, w) {
    var inEdges = this.inEdges(v, w);
    if (inEdges) {
      return inEdges.concat(this.outEdges(v, w));
    }
  }
}

function incrementOrInitEntry(map, k) {
  if (map[k]) {
    map[k]++;
  } else {
    map[k] = 1;
  }
}

function decrementOrRemoveEntry(map, k) {
  if (!--map[k]) { delete map[k]; }
}

function edgeArgsToId(isDirected, v_, w_, name) {
  var v = "" + v_;
  var w = "" + w_;
  if (!isDirected && v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }
  return v + EDGE_KEY_DELIM + w + EDGE_KEY_DELIM +
             (name === undefined ? DEFAULT_EDGE_NAME : name);
}

function edgeArgsToObj(isDirected, v_, w_, name) {
  var v = "" + v_;
  var w = "" + w_;
  if (!isDirected && v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }
  var edgeObj =  { v: v, w: w };
  if (name) {
    edgeObj.name = name;
  }
  return edgeObj;
}

function edgeObjToId(isDirected, edgeObj) {
  return edgeArgsToId(isDirected, edgeObj.v, edgeObj.w, edgeObj.name);
}

module.exports = Graph;

},{}],45:[function(require,module,exports){
// Includes only the "core" of graphlib
module.exports = {
  Graph: require("./graph"),
  version: require("./version")
};

},{"./graph":44,"./version":47}],46:[function(require,module,exports){
var Graph = require("./graph");

module.exports = {
  write: write,
  read: read
};

/**
 * Creates a JSON representation of the graph that can be serialized to a string with
 * JSON.stringify. The graph can later be restored using json.read.
 */
function write(g) {
  var json = {
    options: {
      directed: g.isDirected(),
      multigraph: g.isMultigraph(),
      compound: g.isCompound()
    },
    nodes: writeNodes(g),
    edges: writeEdges(g)
  };

  if (g.graph() !== undefined) {
    json.value = structuredClone(g.graph());
  }
  return json;
}

function writeNodes(g) {
  return g.nodes().map(function(v) {
    var nodeValue = g.node(v);
    var parent = g.parent(v);
    var node = { v: v };
    if (nodeValue !== undefined) {
      node.value = nodeValue;
    }
    if (parent !== undefined) {
      node.parent = parent;
    }
    return node;
  });
}

function writeEdges(g) {
  return g.edges().map(function(e) {
    var edgeValue = g.edge(e);
    var edge = { v: e.v, w: e.w };
    if (e.name !== undefined) {
      edge.name = e.name;
    }
    if (edgeValue !== undefined) {
      edge.value = edgeValue;
    }
    return edge;
  });
}

/**
 * Takes JSON as input and returns the graph representation.
 *
 * @example
 * var g2 = graphlib.json.read(JSON.parse(str));
 * g2.nodes();
 * // ['a', 'b']
 * g2.edges()
 * // [ { v: 'a', w: 'b' } ]
 */
function read(json) {
  var g = new Graph(json.options).setGraph(json.value);
  json.nodes.forEach(function(entry) {
    g.setNode(entry.v, entry.value);
    if (entry.parent) {
      g.setParent(entry.v, entry.parent);
    }
  });
  json.edges.forEach(function(entry) {
    g.setEdge({ v: entry.v, w: entry.w, name: entry.name }, entry.value);
  });
  return g;
}

},{"./graph":44}],47:[function(require,module,exports){
module.exports = '2.2.4';

},{}]},{},[1])(1)
});
