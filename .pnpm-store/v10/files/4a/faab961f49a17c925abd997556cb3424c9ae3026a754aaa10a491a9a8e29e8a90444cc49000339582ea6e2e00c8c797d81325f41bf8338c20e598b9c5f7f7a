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
