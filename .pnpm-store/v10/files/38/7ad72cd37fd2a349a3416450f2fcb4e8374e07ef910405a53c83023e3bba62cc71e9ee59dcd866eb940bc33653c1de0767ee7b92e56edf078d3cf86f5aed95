"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common = require("@ts-graphviz/common");
const Digraph = require("./Digraph.cjs");
const Edge = require("./Edge.cjs");
const Graph = require("./Graph.cjs");
const Node = require("./Node.cjs");
const Subgraph = require("./Subgraph.cjs");
function registerDefault() {
  Object.assign(common.RootModelsContext, {
    Graph: Graph.Graph,
    Digraph: Digraph.Digraph,
    Subgraph: Subgraph.Subgraph,
    Node: Node.Node,
    Edge: Edge.Edge
  });
}
exports.registerDefault = registerDefault;
