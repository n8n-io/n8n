import type { GraphNode, WorkflowGraph } from './workflow-graph';

/** The trigger node (the execution's entry point), or `undefined` if there is none. */
export function findTriggerNode(graph: WorkflowGraph): GraphNode | undefined {
	return graph.nodes.find((node) => node.type === 'trigger');
}

/**
 * Ids of the nodes directly downstream of `nodeId`, de-duplicated, in edge order.
 *
 * TODO(CAT-3854): validate edge endpoints against `nodes`.
 */
export function getSuccessorNodeIds(graph: WorkflowGraph, nodeId: string): string[] {
	const successors: string[] = [];
	for (const edge of graph.edges) {
		if (edge.from === nodeId && !successors.includes(edge.to)) {
			successors.push(edge.to);
		}
	}
	return successors;
}
