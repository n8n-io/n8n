import type { WorkflowGraph, WorkflowLoop } from '../graph';
import { isSettledStatus, type StepKey, type StepStatus } from './execution.types';
import { classifyEdge } from './iteration-mapping';
import type { StepStore, StepSummary } from './step-store';

/** A batch node's output slots. */
export const DONE_SLOT = 0;
export const LOOP_SLOT = 1;
/** Set by a concurrent pass that is not the last one. Never wired to an edge. */
export const HAS_MORE_SLOT = 2;

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

/**
 * What a concurrent loop needs next, decided from its rows alone.
 *
 * A sequential loop advances on the back-edge: pass `i + 1` is planned when the
 * body's return at pass `i` settles. A concurrent loop advances on the pass:
 * pass `i + 1` is planned when pass `i` settles with more items to hand out,
 * as long as fewer than `maxConcurrency` passes are still in the body. A pass
 * is in the body until the back-edge source's row at that pass settles, which
 * is after every body node of that pass settled.
 *
 * Once the last pass is out, the loop's terminal row — the one that fires the
 * done slot — is planned when every pass has returned.
 *
 * Both the batch node's settlement and the back-edge source's settlement call
 * this, so a slot that frees up is used, and a dedupe on the row key makes
 * racing callers converge. Nothing here is queued or counted outside the rows,
 * so a crash between the decision and the insert loses nothing: the next
 * settlement decides again.
 */
export async function decideConcurrentLoopStep(
	stepStore: StepStore,
	executionId: string,
	loop: WorkflowLoop,
	maxConcurrency: number,
	hasRoomInExecution: () => Promise<boolean>,
): Promise<StepKey | undefined> {
	const [backEdge] = loop.backEdges;
	if (!backEdge) return undefined;

	const latest = (await stepStore.loadLatestStepSummaries(executionId, [loop.batchNodeId]))[
		loop.batchNodeId
	];
	// No pass yet, a pass still running, or the loop already ended: nothing to add.
	if (!latest || !isSettledStatus(latest.status) || isTerminalStep(latest)) return undefined;

	const passesStarted = latest.iteration + 1;
	const passesReturned = await stepStore.countSettledStepsOfNode(executionId, backEdge.from);

	if (latest.filledOutputSlots[HAS_MORE_SLOT]) {
		const inFlight = passesStarted - passesReturned;
		if (inFlight >= maxConcurrency) return undefined;
		if (!(await hasRoomInExecution())) return undefined;
		return { nodeId: loop.batchNodeId, iteration: passesStarted };
	}

	// The last pass is out. The terminal row waits for every pass to return.
	if (passesReturned < passesStarted) return undefined;
	return { nodeId: loop.batchNodeId, iteration: passesStarted };
}
