import type { WorkflowGraph, WorkflowLoop } from '../graph';
import { isSettledStatus, type StepStatus } from './execution.types';
import { classifyEdge } from './iteration-mapping';
import type { StepStore, StepSummary } from './step-store';

/** A batch node's output slots. */
export const DONE_SLOT = 0;
export const LOOP_SLOT = 1;

/**
 * A loop's batch node steps form a ledger, one per pass, written strictly in
 * order: pass `i + 1` is planned only once pass `i` has settled.
 *
 * A step ends the loop when it settles without filling its loop slot, either
 * because it fired the done slot instead or because it never ran at all. Nothing
 * can advance the loop past that step, so it is always the last one.
 */
function endsLoop(status: StepStatus, loopSlotFilled: boolean): boolean {
	return isSettledStatus(status) && !loopSlotFilled;
}

export function isTerminalStep(step: StepSummary): boolean {
	return endsLoop(step.status, Boolean(step.filledOutputSlots[LOOP_SLOT]));
}

/**
 * Which loops the edges into `targetNodeIds` need a last pass from.
 *
 * Only an exit edge reads one. Every other edge reads the target's own pass, so
 * a target with no exit edge into it needs nothing looked up.
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
 * The last pass of each loop asked about, by batch node id, leaving out the loops
 * that have not ended.
 *
 * Steps are written in order, so only the latest can be the last one, and a
 * single query answers for every loop. It reads slot flags rather than payloads,
 * since the step ending a loop holds everything that loop accumulated.
 */
export async function loadTerminalIterations(
	stepStore: StepStore,
	executionId: string,
	batchNodeIds: string[],
): Promise<Map<string, number>> {
	if (batchNodeIds.length === 0) return new Map();

	const latest = await stepStore.loadLatestStepSummaries(executionId, batchNodeIds);

	const terminalIterations = new Map<string, number>();
	for (const [batchNodeId, step] of Object.entries(latest)) {
		if (isTerminalStep(step)) terminalIterations.set(batchNodeId, step.iteration);
	}
	return terminalIterations;
}
