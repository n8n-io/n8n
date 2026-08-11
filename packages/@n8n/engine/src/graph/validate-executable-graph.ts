import { UnimplementedError } from '../common';
import type { WorkflowGraph } from './workflow-graph';

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

	// Slot indices are structural, so they're enforced here rather than left to
	// the transport boundary. TODO(CAT-3042): enforce an upper bound too.
	for (const edge of graph.edges) {
		for (const index of [edge.outputIndex, edge.inputIndex]) {
			if (!Number.isInteger(index) || index < 0) {
				throw new GraphValidationError(
					`Edge ${edge.from} → ${edge.to} has slot index ${index}; slot indices are non-negative integers`,
				);
			}
			if (index > MAX_SLOT_INDEX) {
				throw new GraphValidationError(
					`Edge ${edge.from} → ${edge.to} has slot index ${index}; slot indices above ${MAX_SLOT_INDEX} are not supported yet`,
				);
			}
		}
	}

	// TODO(CAT-2874): multi-slot outputs arrive with branching; until then only
	// output slot 0 fires, and the runtime can assume single-slot outputs.
	for (const edge of graph.edges) {
		if (edge.outputIndex !== 0) {
			throw new UnimplementedError(
				`Edge ${edge.from} → ${edge.to} leaves output slot ${edge.outputIndex}; only output slot 0 is supported yet`,
			);
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
