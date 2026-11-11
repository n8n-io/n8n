import { GraphValidationError } from './graph-validation.error';
import { validateLoops } from './loops';
import type { WorkflowGraph } from './workflow-graph';
import { getDescendantNodeIds } from './workflow-graph-queries';

export const MAX_SLOT_INDEX = 100;

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

	validateLoops(graph);

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

	// Several edges into one input slot are allowed: the node runs once per live
	// arrival (see "Runs" in `execution/settlement.ts`). Only a batch node's
	// entries stay single, which `validateLoops` checks.
}
