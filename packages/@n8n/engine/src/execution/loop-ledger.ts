import type { WorkflowGraph, WorkflowLoop } from '../graph';
import { isSettledStatus, type StepStatus } from './execution.types';
import { classifyEdge } from './iteration-mapping';
import type { StepStore, StepSummary } from './step-store';

/** A batch node's output slots: 0 is done, 1 is loop. */
const LOOP_SLOT = 1;

/**
 * A loop's rows form a ledger: one row per iteration of its batch node, written
 * strictly in order, since iteration `i + 1` is planned only once iteration `i`
 * has settled. The last row is the terminal one, and it is the row that says the
 * loop is over.
 *
 * A row ends the loop when it settles without filling its loop slot: it fired
 * the done slot instead, or it never ran at all, as a skipped row records.
 * Nothing can advance the loop past it, so it is always the last row.
 */
export function endsLoop(status: StepStatus, loopSlotFilled: boolean): boolean {
	return isSettledStatus(status) && !loopSlotFilled;
}

/** `endsLoop` for a row, which carries both of the facts it asks for. */
export function isTerminalRow(row: StepSummary): boolean {
	return endsLoop(row.status, Boolean(row.filledOutputSlots[LOOP_SLOT]));
}

/**
 * The batch nodes whose loop-ending row has to be read to resolve the edges into
 * `targetNodeIds`. Only an exit edge reads such a row, so a target with no exit
 * edge into it needs none: every other edge class resolves against the target's
 * own iteration.
 */
export function exitSourcesInto(
	graph: WorkflowGraph,
	loops: WorkflowLoop[],
	targetNodeIds: string[],
): string[] {
	if (loops.length === 0) return [];

	const targets = new Set(targetNodeIds);
	const sources = new Set<string>();
	for (const edge of graph.edges) {
		if (targets.has(edge.to) && classifyEdge(edge, loops) === 'exit') sources.add(edge.from);
	}
	return [...sources];
}

/**
 * The terminal iteration of each loop asked about, by batch node id, omitting
 * the loops that have not ended.
 *
 * Only the latest row can be terminal, since rows are written in order, so this
 * is one read per loop, off the back of the `(execution, node, iteration)` index.
 * It reads the slim view because the row ending a loop holds everything that loop
 * accumulated, and this runs on every settlement.
 */
export async function loadTerminalIterations(
	stepStore: StepStore,
	executionId: string,
	batchNodeIds: string[],
): Promise<Map<string, number>> {
	const rows = await Promise.all(
		batchNodeIds.map(async (batchNodeId) => ({
			batchNodeId,
			latest: await stepStore.loadLatestStepSummary(executionId, batchNodeId),
		})),
	);

	const terminalIterations = new Map<string, number>();
	for (const { batchNodeId, latest } of rows) {
		if (latest && isTerminalRow(latest)) terminalIterations.set(batchNodeId, latest.iteration);
	}
	return terminalIterations;
}
