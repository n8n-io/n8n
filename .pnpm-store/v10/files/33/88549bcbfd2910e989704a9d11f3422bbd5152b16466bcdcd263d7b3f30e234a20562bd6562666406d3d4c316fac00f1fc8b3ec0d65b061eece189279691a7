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
