/**
 * This source code is from https://github.com/jriecken/dependency-graph
 * Just added "any" types here, wrapper everything into exported class.
 * We cant use a package itself because we want to package "everything-in-it" for the frontend users of TypeORM.
 */
export declare class DepGraph {
    nodes: any;
    outgoingEdges: any;
    incomingEdges: any;
    /**
     * Add a node to the dependency graph. If a node already exists, this method will do nothing.
     */
    addNode(node: any, data?: any): void;
    /**
     * Remove a node from the dependency graph. If a node does not exist, this method will do nothing.
     */
    removeNode(node: any): void;
    /**
     * Check if a node exists in the graph
     */
    hasNode(node: any): any;
    /**
     * Get the data associated with a node name
     */
    getNodeData(node: any): any;
    /**
     * Set the associated data for a given node name. If the node does not exist, this method will throw an error
     */
    setNodeData(node: any, data: any): void;
    /**
     * Add a dependency between two nodes. If either of the nodes does not exist,
     * an Error will be thrown.
     */
    addDependency(from: any, to: any): boolean;
    /**
     * Remove a dependency between two nodes.
     */
    removeDependency(from: any, to: any): void;
    /**
     * Get an array containing the nodes that the specified node depends on (transitively).
     *
     * Throws an Error if the graph has a cycle, or the specified node does not exist.
     *
     * If `leavesOnly` is true, only nodes that do not depend on any other nodes will be returned
     * in the array.
     */
    dependenciesOf(node: any, leavesOnly: any): any[];
    /**
     * get an array containing the nodes that depend on the specified node (transitively).
     *
     * Throws an Error if the graph has a cycle, or the specified node does not exist.
     *
     * If `leavesOnly` is true, only nodes that do not have any dependants will be returned in the array.
     */
    dependantsOf(node: any, leavesOnly: any): any[];
    /**
     * Construct the overall processing order for the dependency graph.
     *
     * Throws an Error if the graph has a cycle.
     *
     * If `leavesOnly` is true, only nodes that do not depend on any other nodes will be returned.
     */
    overallOrder(leavesOnly?: any): any[];
}
