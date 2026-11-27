import { GraphValidationError } from './graph-validation.error';
import { validateLoops } from './loops';
import type { WorkflowGraph } from './workflow-graph';
import { createNodeLabeler, getDescendantNodeIds } from './workflow-graph-queries';

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

	const name = createNodeLabeler(graph);

	// A duplicate edge would deliver the same items twice. The v1 converter drops duplicates.
	const seenEdges = new Set<string>();
	for (const edge of graph.edges) {
		const key = JSON.stringify([edge.from, edge.outputIndex, edge.to, edge.inputIndex]);
		if (seenEdges.has(key)) {
			throw new GraphValidationError(
				`Edge ${name(edge.from)} -> ${name(edge.to)} from output slot ${edge.outputIndex} into input slot ${edge.inputIndex} appears more than once`,
			);
		}
		seenEdges.add(key);
	}

	validateLoops(graph);

	const [trigger] = triggers;
	const reachable = new Set([trigger.id, ...getDescendantNodeIds(graph, trigger.id)]);
	for (const edge of graph.edges) {
		if (reachable.has(edge.to) && !reachable.has(edge.from)) {
			throw new GraphValidationError(
				`Edge ${name(edge.from)} -> ${name(edge.to)} feeds a node the trigger reaches from one it cannot reach, so ${name(edge.to)} would wait on ${name(edge.from)} forever`,
			);
		}
	}

	// Slot indices are structural, so they're enforced here rather than left to
	// the transport boundary.
	for (const edge of graph.edges) {
		for (const index of [edge.outputIndex, edge.inputIndex]) {
			if (!Number.isInteger(index) || index < 0) {
				throw new GraphValidationError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} has slot index ${index}; slot indices are non-negative integers`,
				);
			}
			if (index > MAX_SLOT_INDEX) {
				throw new GraphValidationError(
					`Edge ${name(edge.from)} -> ${name(edge.to)} has slot index ${index}; slot indices above ${MAX_SLOT_INDEX} are not supported yet`,
				);
			}
		}
	}
}
