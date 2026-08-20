import type { WorkflowGraph, WorkflowLoop } from '../graph';
import { isSettledStatus, type StepStatus } from './execution.types';
import { classifyEdge } from './iteration-mapping';
import type { StepStore, StepSummary } from './step-store';

/** A batch node's output slots: 0 is done, 1 is loop. */
const LOOP_SLOT = 1;

/**
 * A loop's batch node steps form a ledger: one per iteration, written strictly
 * in order, since iteration `i + 1` is planned only once iteration `i` has
 * settled. The last one is the terminal step, and it is what says the loop is
 * over.
 *
 * A step ends the loop when it settles without filling its loop slot: it fired
 * the done slot instead, or it never ran at all, as a skip records. Nothing can
 * advance the loop past it, so it is always the last one.
 */
export function endsLoop(status: StepStatus, loopSlotFilled: boolean): boolean {
	return isSettledStatus(status) && !loopSlotFilled;
}

/** `endsLoop` for a step, which carries both of the facts it asks for. */
export function isTerminalStep(step: StepSummary): boolean {
	return endsLoop(step.status, Boolean(step.filledOutputSlots[LOOP_SLOT]));
}

/**
 * The batch nodes whose loop-ending step has to be read to resolve the edges
 * into `targetNodeIds`. Only an exit edge reads one, so a target with no exit
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
 * Only the latest step can be terminal, since they are written in order, so one
 * query over every loop answers this. It reads the slim view because the step
 * ending a loop holds everything that loop accumulated, and this runs on every
 * settlement.
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
