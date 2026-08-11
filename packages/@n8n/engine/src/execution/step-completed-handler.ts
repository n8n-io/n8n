import { getPredecessorNodeIds, getSuccessorNodeIds } from '../graph';
import type { StepCompletedEvent, StepMessage, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { StepStore } from './step-store';
import { validateStepContext } from './validate-step-context';

/**
 * Handles the `step:completed` orchestration event: plans the successors of the
 * finished step and publishes `step:ready` for each, or records the execution's
 * outcome when there is nothing left to run.
 *
 * A successor is planned once, when every predecessor has completed — never
 * planned early and held back at run time — so a step row exists only for work
 * whose inputs are all available.
 *
 * An event whose step and execution disagree is rejected before anything is
 * planned, leaving both executions untouched.
 */
export class StepCompletedHandler {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
	) {}

	async handle(event: StepCompletedEvent): Promise<void> {
		const [step, execution] = await Promise.all([
			this.stepStore.loadStep(event.stepId),
			this.executionStore.loadExecution(event.executionId),
		]);
		validateStepContext(step, execution);

		// v1 parity: an error that escapes a node ends the whole execution, not
		// just its branch.
		if (step.status === 'failed') {
			await this.executionStore.finishExecution(execution.id, 'failed');
			await this.stepStore.cancelQueuedSteps(execution.id);
			return;
		}

		if (execution.status !== 'running') return;

		const planned =
			step.status === 'completed' ? await this.planSuccessors(execution, step.nodeId) : 0;

		// If we've planned steps, we know the execution isn't done yet, so we definitely don't need
		// to mark it finished.
		if (planned > 0) return;

		await this.finishExecutionIfDone(execution.id);
	}

	/**
	 * Records the execution's outcome once no step is left to run: `failed` if any
	 * step failed, `completed` otherwise. A no-op while work is still outstanding.
	 *
	 * TODO(CAT-3910): there's a possible race condition with two branches, where
	 * one branch finishes and the other is still running. If we check while the
	 * still-running branch has finished a step but not yet planned its successors,
	 * it will look like there are no active steps and we'll mark the execution
	 * finished. There are a few possible approaches to close this race e.g.,
	 * distinguish between "completed" and "completed AND possible next steps planned".
	 */
	private async finishExecutionIfDone(executionId: string): Promise<void> {
		if (await this.stepStore.hasActiveSteps(executionId)) return;

		const failed = await this.stepStore.hasFailedSteps(executionId);
		await this.executionStore.finishExecution(executionId, failed ? 'failed' : 'completed');
	}

	/** Plans the ready successors of `nodeId`, returning how many were queued. */
	private async planSuccessors(execution: ExecutionRecord, nodeId: string): Promise<number> {
		const readyNodeIds = await this.readySuccessorNodeIds(execution, nodeId);
		if (readyNodeIds.length === 0) return 0;

		// Planned together so a fan-out is one round trip, and published only after
		// the rows exist, so a consumer can always load the step. A step another
		// planner got to first isn't returned, so it isn't announced twice either.
		// TODO(CAT-2938): a crash between the insert and the publishes strands the
		// rows `queued` forever; the reconciler re-announces stale queued steps.
		const created = await this.stepStore.createSteps(
			readyNodeIds.map((readyNodeId) => ({
				executionId: execution.id,
				nodeId: readyNodeId,
				status: 'queued' as const,
			})),
		);

		for (const { id: stepId } of created) {
			await this.stepQueue.publish({
				type: 'step:ready',
				executionId: execution.id,
				stepId,
			});
		}

		return created.length;
	}

	/**
	 * Successors of `nodeId` whose every predecessor has completed.
	 * We get the successors straight from the graph, while we check
	 * for predecessors completion in a single query to the step store,
	 * so a fan-out costs one round trip.
	 *
	 * NOTE: we exclude `nodeId` itself from the check, since we know it's complete.
	 * This also lets us skip a database trip when there's no merging happening,
	 * which is the common case.
	 */
	private async readySuccessorNodeIds(
		execution: ExecutionRecord,
		nodeId: string,
	): Promise<string[]> {
		const successors = getSuccessorNodeIds(execution.graph, nodeId).map((id) => ({
			id,
			predecessorIds: getPredecessorNodeIds(execution.graph, id),
		}));

		// We get all the predecessors of our successors, for possible merging.
		const predecessorsToCheck = successors
			.flatMap(({ predecessorIds }) => predecessorIds)
			// NOTE: we exclude ourselves, since we know we're complete.
			.filter((id) => id !== nodeId);

		const completed =
			predecessorsToCheck.length === 0
				? new Set<string>()
				: await this.stepStore.loadCompletedNodeIds(execution.id, predecessorsToCheck);

		return successors
			.filter(({ predecessorIds }) =>
				predecessorIds.every((id) => id === nodeId || completed.has(id)),
			)
			.map(({ id }) => id);
	}
}
