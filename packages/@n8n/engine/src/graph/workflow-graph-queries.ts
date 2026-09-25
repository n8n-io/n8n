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

/**
 * Ids of every node reachable downstream of `nodeId` (transitive successors),
 * de-duplicated, in BFS order, excluding `nodeId` itself. The completion
 * check counts these against settled rows, and validation uses them to
 * reject unreachable predecessors.
 */
export function getDescendantNodeIds(graph: WorkflowGraph, nodeId: string): string[] {
	// BFS where the queue doubles as the result: every id is appended exactly
	// once, and the index only moves forward.
	const descendants = getSuccessorNodeIds(graph, nodeId);
	const visited = new Set(descendants);
	for (let i = 0; i < descendants.length; i++) {
		for (const successor of getSuccessorNodeIds(graph, descendants[i])) {
			if (visited.has(successor)) continue;
			visited.add(successor);
			descendants.push(successor);
		}
	}
	return descendants;
}

/**
 * Ids of the nodes directly upstream of `nodeId`, de-duplicated, in edge order.
 *
 * TODO(CAT-3854): validate edge endpoints against `nodes`.
 */
export function getPredecessorNodeIds(graph: WorkflowGraph, nodeId: string): string[] {
	const predecessors: string[] = [];
	for (const edge of graph.edges) {
		if (edge.to === nodeId && !predecessors.includes(edge.from)) {
			predecessors.push(edge.from);
		}
	}
	return predecessors;
}
