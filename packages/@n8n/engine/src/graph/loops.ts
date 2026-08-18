import type { GraphEdge, WorkflowGraph } from './workflow-graph';

/** A loop, derived from the graph's marked back-edges. */
export interface WorkflowLoop {
	/** The node the back-edges return to: the loop's entry. */
	batchNodeId: string;
	/** Nodes on cycles through the entry (its strongly connected component). */
	memberIds: Set<string>;
	/** Marked return edges into the entry. */
	backEdges: GraphEdge[];
	/** Forward edges into the entry from outside the loop. */
	entryEdges: GraphEdge[];
	/** Forward edges from a member to a node outside the loop. */
	exitEdges: GraphEdge[];
}

/** One loop per back-edge target, members from the full graph's SCCs. */
export function deriveLoops(graph: WorkflowGraph): WorkflowLoop[] {
	const backEdgeTargets = [...new Set(graph.edges.filter((e) => e.isBackEdge).map((e) => e.to))];
	if (backEdgeTargets.length === 0) return [];

	const sccByNode = computeSccMembership(graph, graph.edges);

	return backEdgeTargets.map((batchNodeId) => {
		const memberIds = sccByNode.get(batchNodeId) ?? new Set([batchNodeId]);
		return {
			batchNodeId,
			memberIds,
			backEdges: graph.edges.filter((e) => e.isBackEdge && e.to === batchNodeId),
			entryEdges: graph.edges.filter(
				(e) => !e.isBackEdge && e.to === batchNodeId && !memberIds.has(e.from),
			),
			exitEdges: graph.edges.filter(
				(e) => !e.isBackEdge && memberIds.has(e.from) && !memberIds.has(e.to),
			),
		};
	});
}

/**
 * Strongly connected components over `edges`, as a node -> members map. A node
 * on no cycle maps to a singleton. Tarjan's algorithm.
 */
export function computeSccMembership(
	graph: WorkflowGraph,
	edges: GraphEdge[],
): Map<string, Set<string>> {
	const outgoing = new Map<string, GraphEdge[]>();
	for (const edge of edges) {
		const list = outgoing.get(edge.from);
		if (list) list.push(edge);
		else outgoing.set(edge.from, [edge]);
	}

	const indexById = new Map<string, number>();
	const lowlinkById = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	const membership = new Map<string, Set<string>>();
	let nextIndex = 0;

	const connect = (nodeId: string): void => {
		indexById.set(nodeId, nextIndex);
		lowlinkById.set(nodeId, nextIndex);
		nextIndex += 1;
		stack.push(nodeId);
		onStack.add(nodeId);

		for (const edge of outgoing.get(nodeId) ?? []) {
			if (!indexById.has(edge.to)) {
				connect(edge.to);
				lowlinkById.set(nodeId, Math.min(lowlinkById.get(nodeId)!, lowlinkById.get(edge.to)!));
			} else if (onStack.has(edge.to)) {
				lowlinkById.set(nodeId, Math.min(lowlinkById.get(nodeId)!, indexById.get(edge.to)!));
			}
		}

		if (lowlinkById.get(nodeId) === indexById.get(nodeId)) {
			const members = new Set<string>();
			let member: string;
			do {
				member = stack.pop()!;
				onStack.delete(member);
				members.add(member);
			} while (member !== nodeId);
			for (const id of members) membership.set(id, members);
		}
	};

	for (const node of graph.nodes) {
		if (!indexById.has(node.id)) connect(node.id);
	}

	return membership;
}

export function isCyclic(members: Set<string>, edges: GraphEdge[]): boolean {
	if (members.size > 1) return true;
	const [only] = members;
	return edges.some((edge) => edge.from === only && edge.to === only);
}
