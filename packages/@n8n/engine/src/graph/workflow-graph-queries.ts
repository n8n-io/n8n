import type { GraphNode, WorkflowGraph } from './workflow-graph';

/** The trigger node (the execution's entry point), or `undefined` if there is none. */
export function findTriggerNode(graph: WorkflowGraph): GraphNode | undefined {
	return graph.nodes.find((node) => node.type === 'trigger');
}

/**
 * Ids of the nodes directly downstream of `nodeId` via forward edges. Back-edges
 * (loop iterations) are ignored; results are de-duplicated, in edge order.
 */
export function getSuccessorNodeIds(graph: WorkflowGraph, nodeId: string): string[] {
	const successors: string[] = [];
	for (const edge of graph.edges) {
		if (edge.from === nodeId && edge.isBackEdge !== true && !successors.includes(edge.to)) {
			successors.push(edge.to);
		}
	}
	return successors;
}
