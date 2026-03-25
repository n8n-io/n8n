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
