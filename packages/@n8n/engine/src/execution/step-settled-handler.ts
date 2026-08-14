import { UnexpectedError } from '../common';
import {
	findTriggerNode,
	getDescendantNodeIds,
	getPredecessorNodeIds,
	getSuccessorNodeIds,
} from '../graph';
import type { OrchestrationMessage, StepMessage, StepSettledEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import { decideSuccessors } from './settlement';
import type { StepStore, StepSummary } from './step-store';
import { validateStepContext } from './validate-step-context';

/**
 * Handles the `step:settled` orchestration event: decides the fate of the
 * settled step's direct successors — queued when a live edge feeds them,
 * skipped when every input is settled dead (see the rules in `settlement.ts`)
 * — and records the execution's outcome once every reachable node has
 * settled. Skips are settlements too: each one is announced back onto the
 * orchestration queue, and handling it here decides the next hop, so a dead
 * region cascades through the event loop one settlement at a time.
 *
 * An event whose step and execution disagree is rejected before anything is
 * planned, leaving both executions untouched.
 */
export class StepSettledHandler {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
	) {}

	async handle(event: StepSettledEvent): Promise<void> {
		const [step, execution] = await Promise.all([
			this.stepStore.loadStep(event.stepId),
			this.executionStore.loadExecution(event.executionId),
		]);
		validateStepContext(step, execution);

		// v1 parity: an error that escapes a node ends the whole execution, not
		// just its branch.
		if (step.status === 'failed') {
			await this.failExecution(execution.id);
			return;
		}

		if (execution.status !== 'running') return;

		let queued = 0;
		if (step.status === 'completed' || step.status === 'skipped') {
			// a failure elsewhere may still have its settled event queued behind
			// this one, so it must end the execution here, before planning
			if (await this.stepStore.hasFailedSteps(execution.id)) {
				await this.failExecution(execution.id);
				return;
			}

			const steps = await this.loadDecisionSteps(execution, step.nodeId);
			queued = await this.planSuccessors(execution, step.nodeId, steps);
		}

		// If we've queued steps, we know the execution isn't done yet, so we
		// definitely don't need to mark it finished.
		if (queued > 0) return;

		await this.finishExecutionIfDone(execution);
	}

	private async failExecution(executionId: string): Promise<void> {
		await this.executionStore.finishExecution(executionId, 'failed');
		await this.stepStore.cancelQueuedSteps(executionId);
	}

	/** Plans the direct successors of `nodeId`, returning how many were queued. */
	private async planSuccessors(
		execution: ExecutionRecord,
		nodeId: string,
		steps: Record<string, StepSummary>,
	): Promise<number> {
		const { toQueue, toSkip } = decideSuccessors(execution.graph, nodeId, steps);
		if (toQueue.length === 0 && toSkip.length === 0) return 0;

		// One batch, so a settlement's consequence lands atomically and a fan-out
		// costs one round trip. A row another planner got to first isn't
		// returned, so it isn't announced twice either.
		// TODO(CAT-2938): a crash between the insert and the publishes strands
		// the rows forever; the reconciler re-announces stale queued steps and
		// settled steps whose decidable successors have no rows.
		const created = await this.stepStore.createSteps(execution.id, [
			...toQueue.map((id) => ({ nodeId: id, status: 'queued' as const })),
			...toSkip.map((id) => ({ nodeId: id, status: 'skipped' as const })),
		]);

		return await this.announceCreatedSteps(execution.id, created, new Set(toQueue));
	}

	/**
	 * The rows a successor decision reads: the successors themselves (an
	 * existing row means already decided) and their predecessors (settledness
	 * and slot liveness), which include the settled node itself.
	 */
	private async loadDecisionSteps(
		execution: ExecutionRecord,
		nodeId: string,
	): Promise<Record<string, StepSummary>> {
		const successors = getSuccessorNodeIds(execution.graph, nodeId);
		const nodeIds = [
			...new Set([
				...successors,
				...successors.flatMap((id) => getPredecessorNodeIds(execution.graph, id)),
			]),
		];
		return await this.stepStore.loadStepSummaries(execution.id, nodeIds);
	}

	/**
	 * Announces the created rows — `step:ready` for queued ones, `step:settled`
	 * for skips, which settle at birth — and returns how many were queued.
	 * Published only after the rows exist, so a consumer can always load them.
	 */
	private async announceCreatedSteps(
		executionId: string,
		created: Array<{ id: string; nodeId: string }>,
		queuedNodeIds: Set<string>,
	): Promise<number> {
		let queued = 0;
		for (const { id: stepId, nodeId } of created) {
			if (queuedNodeIds.has(nodeId)) {
				queued += 1;
				await this.stepQueue.publish({ type: 'step:ready', executionId, stepId });
			} else {
				await this.orchestrationQueue.publish({ type: 'step:settled', executionId, stepId });
			}
		}
		return queued;
	}

	/**
	 * Records the execution's outcome once every reachable node has settled:
	 * `failed` if any step failed, `completed` otherwise. Settled rows are
	 * unique per node, only exist for reachable nodes, and never unsettle, so
	 * the count comparison cannot pass early — in-flight events and unplanned
	 * successors both leave reachable nodes unsettled.
	 */
	private async finishExecutionIfDone(execution: ExecutionRecord): Promise<void> {
		const settled = await this.stepStore.countSettledSteps(execution.id);
		if (settled < this.reachableNodeCount(execution)) return;

		const failed = await this.stepStore.hasFailedSteps(execution.id);
		await this.executionStore.finishExecution(execution.id, failed ? 'failed' : 'completed');
	}

	private reachableNodeCount(execution: ExecutionRecord): number {
		const trigger = findTriggerNode(execution.graph);
		if (!trigger) {
			// The start boundary rejects triggerless graphs, so this execution
			// should never have been created.
			throw new UnexpectedError(`Execution ${execution.id} has no trigger node in its graph`);
		}
		return 1 + getDescendantNodeIds(execution.graph, trigger.id).length;
	}
}
