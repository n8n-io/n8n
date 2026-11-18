import { UnexpectedError } from '../common';
import type { WorkflowLoop } from '../graph';
import type { StepKey, StepStatus } from './execution.types';

/**
 * What admission needs to know about one parallel loop, read in one query by
 * `StepStore.loadParallelLoopProgress`. Counts only, so the cost of a read does
 * not grow with the number of passes.
 */
export interface ParallelLoopProgress {
	/** The status and the pass count of the batch node's pass 0, if it has a row. */
	firstPass?: { status: StepStatus; loopPassCount: number | null };
	/** How many batch node rows exist. They always form the prefix `0..n-1`. */
	createdPasses: number;
	/**
	 * How many passes `p < loopPassCount` have a settled row at the return
	 * edge's source. Every loop member is an ancestor of that source, so a
	 * settled source means that the whole pass is done.
	 */
	settledBodies: number;
}

/**
 * The batch node rows a parallel loop can create now.
 *
 * A sequential loop starts a pass when the return edge brings back the pass
 * before it. A parallel loop starts passes by this rule instead:
 *
 * - Data pass `p` (for `0 < p < N`) can exist iff `p < settledBodies + K`,
 *   where `N` is the pass count and `K` is the max concurrency. So at most `K`
 *   loop bodies run at the same time.
 * - The terminal pass `N` can exist once every data pass has a settled body.
 *   It collects what each pass returned, in pass order, and fires the done slot.
 *
 * The answer is a function of the step rows only. Two planners that race
 * create the same rows, and the unique `(node, iteration)` key drops the
 * duplicates. A planner with a stale read can only see fewer settled bodies,
 * so it can only admit fewer passes. The planner that reads last sees every
 * settled body, so the loop cannot stall.
 */
export function decideLoopAdmission(loop: WorkflowLoop, progress: ParallelLoopProgress): StepKey[] {
	if (!loop.parallel) return [];

	const { firstPass, createdPasses, settledBodies } = progress;
	// Pass 0 comes from the entry edge. Until it completes, the pass count is not known.
	if (firstPass?.status !== 'completed') return [];
	if (firstPass.loopPassCount === null) {
		throw new UnexpectedError(
			`batch node ${loop.batchNodeId} runs in parallel, but its pass 0 recorded no pass count`,
		);
	}

	const passCount = firstPass.loopPassCount;
	// With no items, pass 0 is the terminal pass.
	if (passCount === 0) return [];

	const keys: StepKey[] = [];
	const lastAdmitted = Math.min(passCount - 1, settledBodies + loop.parallel.maxConcurrency - 1);
	for (let pass = Math.max(createdPasses, 1); pass <= lastAdmitted; pass++) {
		keys.push({ nodeId: loop.batchNodeId, iteration: pass });
	}

	if (settledBodies >= passCount && createdPasses <= passCount) {
		keys.push({ nodeId: loop.batchNodeId, iteration: passCount });
	}

	return keys;
}

/**
 * The parallel loop whose admission a settled step can change: its batch node
 * (a pass completed) or the source of its return edge (a body finished).
 */
export function parallelLoopAdvancedBy(
	loops: WorkflowLoop[],
	settled: StepKey,
): WorkflowLoop | undefined {
	return loops.find(
		(loop) =>
			loop.parallel &&
			(loop.batchNodeId === settled.nodeId || loop.backEdges[0]?.from === settled.nodeId),
	);
}
