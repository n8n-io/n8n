import { UnimplementedError } from '../common';
import type { WorkflowGraph } from './workflow-graph';
import { findTriggerNode } from './workflow-graph-queries';

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
	if (!findTriggerNode(graph)) {
		throw new GraphValidationError('Graph has no trigger node to start from');
	}

	// TODO(CAT-3854): loop iteration needs re-runnable steps; until that lands,
	// graphs with back-edges are rejected outright rather than deadlocking.
	if (graph.edges.some((edge) => edge.isBackEdge)) {
		throw new UnimplementedError('Graphs with back-edges (loops) are not supported yet');
	}
}
