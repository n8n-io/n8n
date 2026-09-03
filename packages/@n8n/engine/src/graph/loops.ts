import { UnimplementedError } from '../common';
import { GraphValidationError } from './graph-validation.error';
import { isBatchStepConfig, type GraphEdge, type WorkflowGraph } from './workflow-graph';

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
function computeSccMembership(graph: WorkflowGraph, edges: GraphEdge[]): Map<string, Set<string>> {
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

function isCyclic(members: Set<string>, edges: GraphEdge[]): boolean {
	if (members.size > 1) return true;
	const [only] = members;
	return edges.some((edge) => edge.from === only && edge.to === only);
}

/**
 * Structural rules for loop shapes:
 *
 * 1. Remove the marked back-edges and what remains is acyclic. Termination and
 *    sequential iterations both rely on a loop body being a DAG.
 * 2. A back-edge starts inside its loop and returns to the batch node's input
 *    slot 0.
 * 3. A batch node has exactly one incoming back-edge. With none, the loop can
 *    never advance. With several, returns converge on one input slot.
 * 4. Edges into a batch node feed input slot 0. Edges out of it leave output
 *    slot 0 (done) or output slot 1 (loop).
 * 5. The batch node is the loop's only boundary. Nothing enters the body except
 *    through it, no loop nests inside it, the done slot feeds no member (a node
 *    cannot run both per iteration and after the loop), and the only edge
 *    leaving the member set is the one from that done slot.
 */
export function validateLoops(graph: WorkflowGraph): void {
	const namesById = new Map(graph.nodes.map((node) => [node.id, node.name]));
	const name = (id: string) => namesById.get(id) ?? id;

	// Prerequisites for everything below: colliding IDs would make both
	// component membership and `(nodeId, iteration)` step identity ambiguous,
	// and an edge pointing at a missing node has no membership to test.
	const seenNodeIds = new Set<string>();
	for (const node of graph.nodes) {
		if (seenNodeIds.has(node.id)) {
			throw new GraphValidationError(`Two nodes share the id ${node.id}`);
		}
		seenNodeIds.add(node.id);
	}
	for (const edge of graph.edges) {
		for (const endpoint of [edge.from, edge.to]) {
			if (!namesById.has(endpoint)) {
				throw new GraphValidationError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} references ${endpoint}, which is not a node in the graph`,
				);
			}
		}
	}

	// Rule 1: with the back-edges removed, no component may still be cyclic.
	const forwardEdges = graph.edges.filter((edge) => !edge.isBackEdge);
	for (const members of new Set(computeSccMembership(graph, forwardEdges).values())) {
		if (isCyclic(members, forwardEdges)) {
			throw new GraphValidationError(
				`Nodes ${[...members].map(name).join(', ')} form a cycle with no back-edge to close it, so none of them can ever become runnable`,
			);
		}
	}

	const batchNodeIds = new Set(
		graph.nodes.filter((node) => node.type === 'batch').map((node) => node.id),
	);
	const triggerNodeIds = new Set(
		graph.nodes.filter((node) => node.type === 'trigger').map((node) => node.id),
	);
	const loops = deriveLoops(graph);
	const loopsByBatchNode = new Map(loops.map((loop) => [loop.batchNodeId, loop]));

	// Rule 3, the "none" case. Checked over batch nodes, not over loops: a
	// batch node with no return edge heads no derived loop.
	for (const batchNodeId of batchNodeIds) {
		if (!loopsByBatchNode.has(batchNodeId)) {
			throw new GraphValidationError(
				`Batch node ${name(batchNodeId)} has no back-edge returning to it, so its loop could never advance`,
			);
		}
	}

	for (const loop of loops) {
		const { batchNodeId, memberIds, backEdges } = loop;

		// Rule 2's target, first because every rule below assumes the loop is
		// headed by a batch node.
		if (!batchNodeIds.has(batchNodeId)) {
			throw new GraphValidationError(
				`Node ${name(batchNodeId)} has a back-edge returning to it but is not a batch node`,
			);
		}

		const batchNode = graph.nodes.find((node) => node.id === batchNodeId);
		if (!isBatchStepConfig(batchNode?.config)) {
			throw new GraphValidationError(
				`Batch node ${name(batchNodeId)} has no batch size, and it must be a whole number of at least 1`,
			);
		}

		// Nothing outside the loop points in, so it would start at pass 1 with no pass 0, and never finish.
		for (const memberId of memberIds) {
			if (triggerNodeIds.has(memberId)) {
				throw new GraphValidationError(
					`Trigger ${name(memberId)} is inside the loop of ${name(batchNodeId)}, so that loop could never start`,
				);
			}
		}

		// Nesting, before the shape rules: two looping batch nodes land in one
		// component, which those rules would read as a single malformed loop.
		for (const memberId of memberIds) {
			if (memberId !== batchNodeId && batchNodeIds.has(memberId)) {
				throw new UnimplementedError(
					`Batch node ${name(memberId)} sits inside the loop of ${name(batchNodeId)}; nested loops are not supported yet`,
				);
			}
		}

		// Rule 2's slot and direction: a return arrives on slot 0, from a member.
		for (const edge of backEdges) {
			if (edge.inputIndex !== 0) {
				throw new GraphValidationError(
					`Back-edge ${name(edge.from)} -> ${name(edge.to)} feeds input slot ${edge.inputIndex}; returns feed the batch node's slot 0`,
				);
			}
			if (!memberIds.has(edge.from)) {
				throw new GraphValidationError(
					`Back-edge ${name(edge.from)} -> ${name(edge.to)} returns from outside the loop`,
				);
			}
		}

		// Rule 3, the "several" case: more than one return into that same slot 0.
		if (backEdges.length > 1) {
			throw new UnimplementedError(
				`Batch node ${name(batchNodeId)} has ${backEdges.length} back-edges; multiple returns converge on one input slot, which is not supported yet`,
			);
		}

		// Rule 4: the batch node's own slots, which hold whether or not the edge
		// crosses the loop boundary, hence the scan over every edge.
		for (const edge of graph.edges) {
			if (edge.to === batchNodeId && !edge.isBackEdge && edge.inputIndex !== 0) {
				throw new GraphValidationError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} feeds input slot ${edge.inputIndex} of a batch node, which has only slot 0`,
				);
			}
			if (edge.from === batchNodeId && edge.outputIndex !== 0 && edge.outputIndex !== 1) {
				throw new GraphValidationError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} leaves output slot ${edge.outputIndex} of a batch node, which has only done (0) and loop (1)`,
				);
			}
		}

		// A single entry edge, after rule 4 so that an impossible slot is reported
		// as fatal rather than as an unsupported convergence.
		if (loop.entryEdges.length > 1) {
			throw new UnimplementedError(
				`Batch node ${name(batchNodeId)} has ${loop.entryEdges.length} entry edges; converging entries on its input slot is not supported yet`,
			);
		}

		// Rule 5, the way out: only the batch node's done slot leaves the loop.
		for (const edge of loop.exitEdges) {
			if (edge.from !== batchNodeId) {
				throw new UnimplementedError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} leaves the loop of ${name(batchNodeId)} mid-body; dangling body branches are not supported yet`,
				);
			}
			if (edge.outputIndex !== 0) {
				throw new GraphValidationError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} leaves the loop from the loop slot; only the done slot (0) exits`,
				);
			}
		}
		for (const edge of graph.edges) {
			// Rule 5, where the done slot may point. Marked edges included: a
			// done-slot edge flagged as a return is the same defect.
			if (edge.from === batchNodeId && edge.outputIndex === 0 && memberIds.has(edge.to)) {
				throw new GraphValidationError(
					`Done slot of ${name(batchNodeId)} feeds ${name(edge.to)}, a member of its own loop; a node cannot run both per iteration and after the loop`,
				);
			}
			// Rule 5, the way in: the batch node is the only entrance to the body.
			if (
				!edge.isBackEdge &&
				memberIds.has(edge.to) &&
				edge.to !== batchNodeId &&
				!memberIds.has(edge.from)
			) {
				throw new GraphValidationError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} enters the loop of ${name(batchNodeId)} mid-body; the batch node is the only way in`,
				);
			}
		}
	}
}
