import type { GraphEdge, WorkflowLoop } from '../graph';
import type { StepKey } from './execution.types';

/**
 * Which rows an edge connects, given that a loop member has one row per
 * iteration. Each class fixes the iteration of the edge's source row (at
 * `edge.from`) and of its target row (at `edge.to`):
 *
 * - `plain`: neither end is in a loop, so both rows sit at iteration 0.
 * - `entry`: enters a batch node from outside. Target iteration 0 only, since
 *   later iterations are reached by the return edge instead.
 * - `intra`: both ends inside one loop, so source and target share an iteration.
 * - `back`: the marked return edge, where source iteration `i` pairs with target
 *   iteration `i + 1`.
 * - `exit`: leaves a loop from the batch node's done slot. Its source is the
 *   loop's terminal row, whatever iteration that is, and its target sits at
 *   iteration 0.
 */
export type EdgeClass = 'plain' | 'entry' | 'intra' | 'back' | 'exit';

/**
 * The source row an edge has at a given target iteration. The two empty cases
 * mean different things and must not be collapsed:
 *
 * - `none`: the edge connects nothing at this target iteration, so the caller
 *   ignores it. An entry edge has a source at target iteration 0 only, a return
 *   edge at target iteration 1 upwards only. Treating this as unresolved would
 *   leave every later iteration undecidable.
 * - `pending`: the source is a terminal row that does not exist yet, so the
 *   caller leaves the decision undecidable. Treating this as `none` would decide
 *   the done side of a loop that has not ended, and settled fates are immutable.
 */
export type SourceRow = { kind: 'row'; key: StepKey } | { kind: 'none' } | { kind: 'pending' };

export function classifyEdge(edge: GraphEdge, loops: WorkflowLoop[]): EdgeClass {
	if (edge.isBackEdge) return 'back';

	const sourceLoop = loops.find((loop) => loop.memberIds.has(edge.from));
	const targetLoop = loops.find((loop) => loop.memberIds.has(edge.to));

	if (sourceLoop && sourceLoop === targetLoop) return 'intra';
	// An edge leaving one loop into another matches both `exit` and `entry`.
	// `exit` is the correct one: the source row is the first loop's terminal row.
	// The target row sits at iteration 0 either way.
	if (sourceLoop) return 'exit';
	if (targetLoop) return 'entry';
	return 'plain';
}

/** The target row, given the source row. */
export function targetKey(edge: GraphEdge, edgeClass: EdgeClass, source: StepKey): StepKey {
	switch (edgeClass) {
		case 'back':
			return { nodeId: edge.to, iteration: source.iteration + 1 };
		case 'exit':
		case 'entry':
			return { nodeId: edge.to, iteration: 0 };
		default:
			return { nodeId: edge.to, iteration: source.iteration };
	}
}

/** The source row, given the target row. */
export function sourceRow(
	edge: GraphEdge,
	edgeClass: EdgeClass,
	target: StepKey,
	terminalIteration?: number,
): SourceRow {
	const row = (iteration: number): SourceRow => ({
		kind: 'row',
		key: { nodeId: edge.from, iteration },
	});

	switch (edgeClass) {
		case 'back':
			return target.iteration === 0 ? { kind: 'none' } : row(target.iteration - 1);
		case 'entry':
			return target.iteration > 0 ? { kind: 'none' } : row(0);
		case 'exit':
			if (target.iteration > 0) return { kind: 'none' };
			return terminalIteration === undefined ? { kind: 'pending' } : row(terminalIteration);
		default:
			return row(target.iteration);
	}
}
