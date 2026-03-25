// Type definitions for graphlib 2.1.1
// Project: https://github.com/cpettitt/graphlib
// Definitions by: Dan Vanderkam <http://danvk.org/>, Dan Mironenko <wolfson@bracketedrebels.com>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module '@dagrejs/graphlib' {
  export interface GraphOptions {
    directed?: boolean; // default: true.
    multigraph?: boolean; // default: false.
    compound?: boolean; // default: false.
  }

  export interface Edge {
    v: string;
    w: string;
    /** The name that uniquely identifies a multi-edge. */
    name?: string;
  }

  export class Graph {
    constructor(options?: GraphOptions);

    /**
     * Sets the default node label. This label will be assigned as default label
     * in case if no label was specified while setting a node.
     * Complexity: O(1).
     *
     * @argument label - default node label.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setDefaultNodeLabel(label: any): Graph;

    /**
     * Sets the default node label factory function. This function will be invoked
     * each time when setting a node with no label specified and returned value
     * will be used as a label for node.
     * Complexity: O(1).
     *
     * @argument labelFn - default node label factory function.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setDefaultNodeLabel(labelFn: (v: string) => any): Graph;

    /**
     * Creates or updates the value for the node v in the graph. If label is supplied
     * it is set as the value for the node. If label is not supplied and the node was
     * created by this call then the default node label will be assigned.
     * Complexity: O(1).
     *
     * @argument name - node name.
     * @argument label - value to set for node.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setNode(name: string, label?: any): Graph;

    /**
     * Invokes setNode method for each node in names list.
     * Complexity: O(|names|).
     *
     * @argument names - list of nodes names to be set.
     * @argument label - value to set for each node in list.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setNodes(names: string[], label?: any): Graph;

    /**
     * Sets node p as a parent for node v if it is defined, or removes the
     * parent for v if p is undefined. Method throws an exception in case of
     * invoking it in context of noncompound graph.
     * Average-case complexity: O(1).
     *
     * @argument v - node to be child for p.
     * @argument p - node to be parent for v.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setParent(v: string, p?: string): Graph;

    /**
     * Gets parent node for node v.
     * Complexity: O(1).
     *
     * @argument v - node to get parent of.
     * @returns parent node name or void if v has no parent.
     */
    parent(v: string): string | void;

    /**
     * Gets list of direct children of node v.
     * Complexity: O(1).
     *
     * @argument v - node to get children of.
     * @returns children nodes names list.
     */
    children(v: string): string[];

    /**
     * Creates new graph with nodes filtered via filter. Edges incident to rejected node
     * are also removed. In case of compound graph, if parent is rejected by filter,
     * than all its children are rejected too.
     * Average-case complexity: O(|E|+|V|).
     *
     * @argument filter - filtration function detecting whether the node should stay or not.
     * @returns new graph made from current and nodes filtered.
     */
    filterNodes(filter: (v: string) => boolean): Graph;

    /**
     * Sets the default edge label. This label will be assigned as default label
     * in case if no label was specified while setting an edge.
     * Complexity: O(1).
     *
     * @argument label - default edge label.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setDefaultEdgeLabel(label: any): Graph;

    /**
     * Sets the default edge label factory function. This function will be invoked
     * each time when setting an edge with no label specified and returned value
     * will be used as a label for edge.
     * Complexity: O(1).
     *
     * @argument labelFn - default edge label factory function.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setDefaultEdgeLabel(labelFn: (v: string) => any): Graph;

    /**
     * Establish an edges path over the nodes in nodes list. If some edge is already
     * exists, it will update its label, otherwise it will create an edge between pair
     * of nodes with label provided or default label if no label provided.
     * Complexity: O(|nodes|).
     *
     * @argument nodes - list of nodes to be connected in series.
     * @argument label - value to set for each edge between pairs of nodes.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setPath(nodes: string[], label?: any): Graph;

    /**
     * Detects whether graph has a node with specified name or not.

     *
     * @argument name - name of the node.
     * @returns true if graph has node with specified name, false - otherwise.
     */
    hasNode(name: string): boolean;

    /**
     * Remove the node with the name from the graph or do nothing if the node is not in
     * the graph. If the node was removed this function also removes any incident
     * edges.
     * Complexity: O(1).
     *
     * @argument name - name of the node.
     * @returns the graph, allowing this to be chained with other functions.
     */
    removeNode(name: string): Graph;

    /**
     * Gets all nodes of the graph. Note, the in case of compound graph subnodes are
     * not included in list.
     * Complexity: O(1).
     *
     * @returns list of graph nodes.
     */
    nodes(): string[];

    /**
     * Gets the label of node with specified name.
     * Complexity: O(|V|).
     *
     * @returns label value of the node.
     */
    node(name: string): any;

    /**
     * Creates or updates the label for the edge (v, w) with the optionally supplied
     * name. If label is supplied it is set as the value for the edge. If label is not
     * supplied and the edge was created by this call then the default edge label will
     * be assigned. The name parameter is only useful with multigraphs.
     * Complexity: O(1).
     *
     * @argument v - edge source node.
     * @argument w - edge sink node.
     * @argument label - value to associate with the edge.
     * @argument name - unique name of the edge in order to identify it in multigraph.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setEdge(v: string, w: string, label?: any, name?: string): Graph;

    /**
     * Creates or updates the label for the specified edge. If label is supplied it is
     * set as the value for the edge. If label is not supplied and the edge was created
     * by this call then the default edge label will be assigned. The name parameter is
     * only useful with multigraphs.
     * Complexity: O(1).
     *
     * @argument edge - edge descriptor.
     * @argument label - value to associate with the edge.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setEdge(edge: Edge, label?: any): Graph;

    /**
     * Gets edges of the graph. In case of compound graph subgraphs are not considered.
     * Complexity: O(|E|).
     *
     * @return graph edges list.
     */
    edges(): Edge[];

    /**
     * Gets the label for the specified edge.
     * Complexity: O(1).
     *
     * @argument v - edge source node.
     * @argument w - edge sink node.
     * @argument name - name of the edge (actual for multigraph).
     * @returns value associated with specified edge.
     */
    edge(v: string, w: string, name?: string): any;

    /**
     * Gets the label for the specified edge.
     * Complexity: O(1).
     *
     * @argument edge - edge descriptor.
     * @returns value associated with specified edge.
     */
    edge(e: Edge): any;

    /**
     * Gets the label for the specified edge and converts it to an object.
     * Complexity: O(1).
     *
     * @argument v - edge source node.
     * @argument w - edge sink node.
     * @argument name - name of the edge (actual for multigraph).
     * @returns value associated with specified edge.
     */
    edgeAsObj(v: string, w: string, name?: string): Object;

    /**
     * Gets the label for the specified edge and converts it to an object.
     * Complexity: O(1).
     *
     * @argument edge - edge descriptor.
     * @returns value associated with specified edge.
     */
    edgeAsObj(e: Edge): Object;

    /**
     * Detects whether the graph contains specified edge or not. No subgraphs are considered.
     * Complexity: O(1).
     *
     * @argument v - edge source node.
     * @argument w - edge sink node.
     * @argument name - name of the edge (actual for multigraph).
     * @returns whether the graph contains the specified edge or not.
     */
    hasEdge(v: string, w: string, name?: string): boolean;

    /**
     * Detects whether the graph contains specified edge or not. No subgraphs are considered.
     * Complexity: O(1).
     *
     * @argument edge - edge descriptor.
     * @returns whether the graph contains the specified edge or not.
     */
    hasEdge(edge: Edge): boolean;

    /**
     * Removes the specified edge from the graph. No subgraphs are considered.
     * Complexity: O(1).
     *
     * @argument edge - edge descriptor.
     * @returns the graph, allowing this to be chained with other functions.
     */
    removeEdge(edge: Edge): Graph;

    /**
     * Removes the specified edge from the graph. No subgraphs are considered.
     * Complexity: O(1).
     *
     * @argument v - edge source node.
     * @argument w - edge sink node.
     * @argument name - name of the edge (actual for multigraph).
     * @returns the graph, allowing this to be chained with other functions.
     */
    removeEdge(v: string, w: string, name?: string): Graph;

    /**
     * Return all edges that point to the node v. Optionally filters those edges down to just those
     * coming from node u. Behavior is undefined for undirected graphs - use nodeEdges instead.
     * Complexity: O(|E|).
     *
     * @argument v - edge sink node.
     * @argument w - edge source node.
     * @returns edges descriptors list if v is in the graph, or undefined otherwise.
     */
    inEdges(v: string, w?: string): void | Edge[];

    /**
     * Return all edges that are pointed at by node v. Optionally filters those edges down to just
     * those point to w. Behavior is undefined for undirected graphs - use nodeEdges instead.
     * Complexity: O(|E|).
     *
     * @argument v - edge source node.
     * @argument w - edge sink node.
     * @returns edges descriptors list if v is in the graph, or undefined otherwise.
     */
    outEdges(v: string, w?: string): void | Edge[];

    /**
     * Returns all edges to or from node v regardless of direction. Optionally filters those edges
     * down to just those between nodes v and w regardless of direction.
     * Complexity: O(|E|).
     *
     * @argument v - edge adjacent node.
     * @argument w - edge adjacent node.
     * @returns edges descriptors list if v is in the graph, or undefined otherwise.
     */
    nodeEdges(v: string, w?: string): void | Edge[];

    /**
     * Return all nodes that are predecessors of the specified node or undefined if node v is not in
     * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
     * Complexity: O(|V|).
     *
     * @argument v - node identifier.
     * @returns node identifiers list or undefined if v is not in the graph.
     */
    predecessors(v: string): void | string[];

    /**
     * Return all nodes that are successors of the specified node or undefined if node v is not in
     * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
     * Complexity: O(|V|).
     *
     * @argument v - node identifier.
     * @returns node identifiers list or undefined if v is not in the graph.
     */
    successors(v: string): void | string[];

    /**
     * Return all nodes that are predecessors or successors of the specified node or undefined if
     * node v is not in the graph.
     * Complexity: O(|V|).
     *
     * @argument v - node identifier.
     * @returns node identifiers list or undefined if v is not in the graph.
     */

    neighbors(v: string): void | string[];

    /**
     * Whether graph was created with 'directed' flag set to true or not.
     *
     * @returns whether the graph edges have an orientation.
     */
    isDirected(): boolean;

    /**
     * Whether graph was created with 'multigraph' flag set to true or not.
     *
     * @returns whether the pair of nodes of the graph can have multiple edges.
     */
    isMultigraph(): boolean;

    /**
     * Whether graph was created with 'compound' flag set to true or not.
     *
     * @returns whether a node of the graph can have subnodes.
     */
    isCompound(): boolean;

    /**
     * Sets the label of the graph.
     *
     * @argument label - label value.
     * @returns the graph, allowing this to be chained with other functions.
     */
    setGraph(label: any): Graph;

    /**
     * Gets the graph label.
     *
     * @returns currently assigned label for the graph or undefined if no label assigned.
     */
    graph(): any;

    /**
     * Gets the number of nodes in the graph.
     * Complexity: O(1).
     *
     * @returns nodes count.
     */
    nodeCount(): number;

    /**
     * Gets the number of edges in the graph.
     * Complexity: O(1).
     *
     * @returns edges count.
     */
    edgeCount(): number;

    /**
     * Gets list of nodes without in-edges.
     * Complexity: O(|V|).
     *
     * @returns the graph source nodes.
     */
    sources(): string[];

    /**
     * Gets list of nodes without out-edges.
     * Complexity: O(|V|).
     *
     * @returns the graph source nodes.
     */
    sinks(): string[];
  }

  export namespace json {
    /**
     * Creates a JSON representation of the graph that can be serialized to a string with
     * JSON.stringify. The graph can later be restored using json.read.
     *
     * @argument graph - target to create JSON representation of.
     * @returns JSON serializable graph representation
     */
    function write(graph: Graph): Object;

    /**
     * Takes JSON as input and returns the graph representation.
     *
     * @example
     * var g2 = graphlib.json.read(JSON.parse(str));
     * g2.nodes();
     * // ['a', 'b']
     * g2.edges()
     * // [ { v: 'a', w: 'b' } ]
     *
     * @argument json - JSON serializable graph representation
     * @returns graph constructed acccording to specified representation
     */
    function read(json: Object): Graph;
  }

  export interface Path {
    distance: number;
    predecessor: string;
  }

  export namespace alg {
    /**
     * Finds all connected components in a graph and returns an array of these components.
     * Each component is itself an array that contains the ids of nodes in the component.
     * Complexity: O(|V|).
     *
     * @argument graph - graph to find components in.
     * @returns array of nodes list representing components
     */
    function components(graph: Graph): string[][];

    /**
     * This function is an implementation of Dijkstra's algorithm which finds the shortest
     * path from source to all other nodes in graph. This function returns a map of
     * v -> { distance, predecessor }. The distance property holds the sum of the weights
     * from source to v along the shortest path or Number.POSITIVE_INFINITY if there is no path
     * from source. The predecessor property can be used to walk the individual elements of the
     * path from source to v in reverse order.
     * Complexity: O((|E| + |V|) * log |V|).
     *
     * @argument graph - graph where to search pathes.
     * @argument source - node to start pathes from.
     * @argument weightFn - function which takes edge e and returns the weight of it. If no weightFn
     * is supplied then each edge is assumed to have a weight of 1. This function throws an
     * Error if any of the traversed edges have a negative edge weight.
     * @argument edgeFn - function which takes a node v and returns the ids of all edges incident to it
     * for the purposes of shortest path traversal. By default this function uses the graph.outEdges.
     * @returns shortest pathes map that starts from node source
     */
    function dijkstra(
      graph: Graph,
      source: string,
      weightFn?: (e: Edge) => number,
      edgeFn?: (v: string) => Edge[]
    ): { [node: string]: Path };

    /**
     * This function finds the shortest path from each node to every other reachable node in
     * the graph. It is similar to alg.dijkstra, but instead of returning a single-source
     * array, it returns a mapping of source -> alg.dijksta(g, source, weightFn, edgeFn).
     * Complexity: O(|V| * (|E| + |V|) * log |V|).
     *
     * @argument graph - graph where to search pathes.
     * @argument weightFn - function which takes edge e and returns the weight of it. If no weightFn
     * is supplied then each edge is assumed to have a weight of 1. This function throws an
     * Error if any of the traversed edges have a negative edge weight.
     * @argument edgeFn - function which takes a node v and returns the ids of all edges incident to it
     * for the purposes of shortest path traversal. By default this function uses the graph.outEdges.
     * @returns shortest pathes map.
     */
    function dijkstraAll(
      graph: Graph,
      weightFn?: (e: Edge) => number,
      edgeFn?: (v: string) => Edge[]
    ): { [source: string]: { [node: string]: Path } };

    /**
     * Given a Graph, graph, this function returns all nodes that are part of a cycle. As there
     * may be more than one cycle in a graph this function return an array of these cycles,
     * where each cycle is itself represented by an array of ids for each node involved in
     * that cycle. Method alg.isAcyclic is more efficient if you only need to determine whether a graph has a
     * cycle or not.
     * Complexity: O(|V| + |E|).
     *
     * @argument graph - graph where to search cycles.
     * @returns cycles list.
     */
    function findCycles(graph: Graph): string[][];

    /**
     * Given a Graph, graph, this function returns true if the graph has no cycles and returns false if it
     * does. This algorithm returns as soon as it detects the first cycle. You can use alg.findCycles
     * to get the actual list of cycles in the graph.
     *
     * @argument graph - graph to detect whether it acyclic ot not.
     * @returns whether graph contain cycles or not.
     */
    function isAcyclic(graph: Graph): boolean;

    /**
     * This function is an implementation of the Floyd-Warshall algorithm, which finds the
     * shortest path from each node to every other reachable node in the graph. It is similar
     * to alg.dijkstraAll, but it handles negative edge weights and is more efficient for some types
     * of graphs. This function returns a map of source -> { target -> { distance, predecessor }.
     * The distance property holds the sum of the weights from source to target along the shortest
     * path of Number.POSITIVE_INFINITY if there is no path from source. The predecessor property
     * can be used to walk the individual elements of the path from source to target in reverse
     * order.
     * Complexity: O(|V|^3).
     *
     * @argument graph - graph where to search pathes.
     * @argument weightFn - function which takes edge e and returns the weight of it. If no weightFn
     * is supplied then each edge is assumed to have a weight of 1. This function throws an
     * Error if any of the traversed edges have a negative edge weight.
     * @argument edgeFn - function which takes a node v and returns the ids of all edges incident to it
     * for the purposes of shortest path traversal. By default this function uses the graph.outEdges.
     * @returns shortest pathes map.
     */
    function floydWarshall(
      graph: Graph,
      weightFn?: (e: Edge) => number,
      edgeFn?: (v: string) => Edge[]
    ): { [source: string]: { [node: string]: Path } };

    /**
     * Prim's algorithm takes a connected undirected graph and generates a minimum spanning tree. This
     * function returns the minimum spanning tree as an undirected graph. This algorithm is derived
     * from the description in "Introduction to Algorithms", Third Edition, Cormen, et al., Pg 634.
     * Complexity: O(|E| * log |V|);
     *
     * @argument graph - graph to generate a minimum spanning tree of.
     * @argument weightFn - function which takes edge e and returns the weight of it. It throws an Error if
     *           the graph is not connected.
     * @returns minimum spanning tree of graph.
     */
    function prim(graph: Graph, weightFn: (e: Edge) => number): Graph;

    /**
     * This function is an implementation of Tarjan's algorithm which finds all strongly connected
     * components in the directed graph g. Each strongly connected component is composed of nodes that
     * can reach all other nodes in the component via directed edges. A strongly connected component
     * can consist of a single node if that node cannot both reach and be reached by any other
     * specific node in the graph. Components of more than one node are guaranteed to have at least
     * one cycle.
     * Complexity: O(|V| + |E|).
     *
     * @argument graph - graph to find all strongly connected components of.
     * @return  an array of components. Each component is itself an array that contains
     *          the ids of all nodes in the component.
     */
    function tarjan(graph: Graph): string[][];

    /**
     * Given a Graph graph this function applies topological sorting to it.
     * If the graph has a cycle it is impossible to generate such a list and CycleException is thrown.
     * Complexity: O(|V| + |E|).
     *
     * @argument graph - graph to apply topological sorting to.
     * @returns an array of nodes such that for each edge u -> v, u appears before v in the array.
     */
    function topsort(graph: Graph): string[];

    /**
     * Performs pre-order depth first traversal on the input graph. If the graph is
     * undirected then this algorithm will navigate using neighbors. If the graph
     * is directed then this algorithm will navigate using successors.
     *
     * @argument graph - depth first traversal target.
     * @argument vs - nodes list to traverse.
     * @returns the nodes in the order they were visited as a list of their names.
     */
    function preorder(graph: Graph, vs: string[]): string[];

    /**
     * Performs post-order depth first traversal on the input graph. If the graph is
     * undirected then this algorithm will navigate using neighbors. If the graph
     * is directed then this algorithm will navigate using successors.
     *
     * @argument graph - depth first traversal target.
     * @argument vs - nodes list to traverse.
     * @returns the nodes in the order they were visited as a list of their names.
     */
    function postorder(graph: Graph, vs: string[]): string[];
  }
}
