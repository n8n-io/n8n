import { RootModelsContext, createModelsContext, isNodeRefGroupLike, toNodeRefGroup, toNodeRef } from "@ts-graphviz/common";
import { AttributeList } from "./AttributeList.js";
import { AttributesBase } from "./AttributesBase.js";
class GraphBase extends AttributesBase {
  /** @hidden */
  #models = RootModelsContext;
  id;
  comment;
  attributes = Object.freeze({
    graph: new AttributeList("Graph"),
    edge: new AttributeList("Edge"),
    node: new AttributeList("Node")
  });
  get nodes() {
    return Array.from(this.#objects.nodes.values());
  }
  get edges() {
    return Array.from(this.#objects.edges.values());
  }
  get subgraphs() {
    return Array.from(this.#objects.subgraphs.values());
  }
  /** @hidden */
  #objects = {
    nodes: /* @__PURE__ */ new Map(),
    edges: /* @__PURE__ */ new Set(),
    subgraphs: /* @__PURE__ */ new Set()
  };
  with(models) {
    this.#models = createModelsContext(models);
  }
  addNode(node) {
    this.#objects.nodes.set(node.id, node);
  }
  addEdge(edge) {
    this.#objects.edges.add(edge);
  }
  addSubgraph(subgraph) {
    this.#objects.subgraphs.add(subgraph);
  }
  existNode(nodeId) {
    return this.#objects.nodes.has(nodeId);
  }
  existEdge(edge) {
    return this.#objects.edges.has(edge);
  }
  existSubgraph(subgraph) {
    return this.#objects.subgraphs.has(subgraph);
  }
  createSubgraph(...args) {
    const subgraph = new this.#models.Subgraph(...args);
    subgraph.with(this.#models);
    this.addSubgraph(subgraph);
    return subgraph;
  }
  removeNode(node) {
    this.#objects.nodes.delete(typeof node === "string" ? node : node.id);
  }
  removeEdge(edge) {
    this.#objects.edges.delete(edge);
  }
  removeSubgraph(subgraph) {
    this.#objects.subgraphs.delete(subgraph);
  }
  createNode(id, attributes) {
    const node = new this.#models.Node(id, attributes);
    this.addNode(node);
    return node;
  }
  getSubgraph(id) {
    return Array.from(this.#objects.subgraphs.values()).find(
      (subgraph) => subgraph.id === id
    );
  }
  getNode(id) {
    return this.#objects.nodes.get(id);
  }
  createEdge(targets, attributes) {
    const ts = targets.map(
      (t) => isNodeRefGroupLike(t) ? toNodeRefGroup(t) : toNodeRef(t)
    );
    const edge = new this.#models.Edge(ts, attributes);
    this.addEdge(edge);
    return edge;
  }
  subgraph(...args) {
    const id = args.find(
      (arg) => typeof arg === "string"
    );
    const attributes = args.find(
      (arg) => typeof arg === "object" && arg !== null
    );
    const callback = args.find(
      (arg) => typeof arg === "function"
    );
    const subgraph = id ? this.getSubgraph(id) ?? this.createSubgraph(id) : this.createSubgraph();
    if (attributes !== void 0) {
      subgraph.apply(attributes);
    }
    if (callback !== void 0) {
      callback(subgraph);
    }
    return subgraph;
  }
  node(firstArg, ...args) {
    if (typeof firstArg === "string") {
      const id = firstArg;
      const attributes = args.find(
        (arg) => typeof arg === "object" && arg !== null
      );
      const callback = args.find(
        (arg) => typeof arg === "function"
      );
      const node = this.getNode(id) ?? this.createNode(id);
      if (attributes !== void 0) {
        node.attributes.apply(attributes);
      }
      if (callback !== void 0) {
        callback(node);
      }
      return node;
    }
    if (typeof firstArg === "object" && firstArg !== null) {
      this.attributes.node.apply(firstArg);
    }
  }
  edge(firstArg, ...args) {
    if (Array.isArray(firstArg)) {
      const targets = firstArg;
      const attributes = args.find(
        (arg) => typeof arg === "object"
      );
      const callback = args.find(
        (arg) => typeof arg === "function"
      );
      const edge = this.createEdge(targets, attributes);
      if (callback !== void 0) {
        callback(edge);
      }
      return edge;
    }
    if (typeof firstArg === "object" && firstArg !== null) {
      this.attributes.edge.apply(firstArg);
    }
  }
  graph(attributes) {
    this.attributes.graph.apply(attributes);
  }
}
export {
  GraphBase
};
