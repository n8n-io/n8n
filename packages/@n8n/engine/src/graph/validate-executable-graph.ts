import { UnimplementedError } from '../common';
import { computeSccMembership, deriveLoops, isCyclic } from './loops';
import type { WorkflowGraph } from './workflow-graph';
import { getDescendantNodeIds } from './workflow-graph-queries';

const MAX_SLOT_INDEX = 100;

/** Thrown when a graph fails a structural rule and can never execute. */
export class GraphValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GraphValidationError';
	}
}

/**
 * Asserts the graph is one the engine is willing to execute, before any state
 * is created for it. The single place executability rules live; new rules are
 * added here as they arise.
 *
 * Throws `GraphValidationError` for graphs that can never run, and
 * `UnimplementedError` for shapes the engine doesn't support yet.
 */
export function validateExecutableGraph(graph: WorkflowGraph): void {
	const triggers = graph.nodes.filter((node) => node.type === 'trigger');
	if (triggers.length === 0) {
		throw new GraphValidationError('Graph has no trigger node to start from');
	}
	if (triggers.length > 1) {
		throw new GraphValidationError('Graph must have exactly one trigger node');
	}

	// TODO(CAT-2875): loop iteration needs re-runnable steps; until that lands,
	// graphs with back-edges are rejected outright rather than deadlocking.
	if (graph.edges.some((edge) => edge.isBackEdge)) {
		throw new UnimplementedError('Graphs with back-edges (loops) are not supported yet');
	}

	const [trigger] = triggers;
	const reachable = new Set([trigger.id, ...getDescendantNodeIds(graph, trigger.id)]);
	for (const edge of graph.edges) {
		if (reachable.has(edge.to) && !reachable.has(edge.from)) {
			throw new GraphValidationError(
				`Edge ${edge.from} -> ${edge.to} feeds a node the trigger reaches from one it cannot reach, so ${edge.to} would wait on ${edge.from} forever`,
			);
		}
	}

	// Slot indices are structural, so they're enforced here rather than left to
	// the transport boundary. TODO(CAT-3042): enforce an upper bound too.
	for (const edge of graph.edges) {
		for (const index of [edge.outputIndex, edge.inputIndex]) {
			if (!Number.isInteger(index) || index < 0) {
				throw new GraphValidationError(
					`Edge ${edge.from} -> ${edge.to} has slot index ${index}; slot indices are non-negative integers`,
				);
			}
			if (index > MAX_SLOT_INDEX) {
				throw new GraphValidationError(
					`Edge ${edge.from} -> ${edge.to} has slot index ${index}; slot indices above ${MAX_SLOT_INDEX} are not supported yet`,
				);
			}
		}
	}

	// TODO(CAT-3982): same-slot convergence gets a defined meaning (concatenation);
	// until then it is rejected rather than given accidental semantics.
	const seenInputSlots = new Set<string>();
	for (const edge of graph.edges) {
		const slot = `${edge.to}#${edge.inputIndex}`;
		if (seenInputSlots.has(slot)) {
			throw new UnimplementedError(
				`Node ${edge.to} has more than one edge into input slot ${edge.inputIndex}; converging branches on one slot is not supported yet`,
			);
		}
		seenInputSlots.add(slot);
	}
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
			if (edge.from === batchNodeId && edge.outputIndex > 1) {
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
