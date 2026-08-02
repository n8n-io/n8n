import { getPredecessorNodeIds, getSuccessorNodeIds } from '../graph';
import type { StepCompletedEvent, StepMessage, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { StepStore } from './step-store';

/**
 * Handles the `step:completed` orchestration event: plans the successors of the
 * finished step and publishes `step:ready` for each, or records the execution's
 * outcome when there is nothing left to run.
 *
 * A successor is planned once, when every predecessor has completed — never
 * planned early and held back at run time — so a step row exists only for work
 * whose inputs are all available.
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

		// A step that didn't complete ends its branch: no successor of it can have
		// all of its inputs.
		const planned =
			step.status === 'completed' ? await this.planSuccessors(execution, step.nodeId) : 0;

		// A planned step always runs eventually, so it will report its own completion
		// and the execution gets tested for completion then.
		if (planned > 0) return;

		await this.finishIfDone(execution.id);
	}

	/** Plans the ready successors of `nodeId`, returning how many were queued. */
	private async planSuccessors(execution: ExecutionRecord, nodeId: string): Promise<number> {
		const readyNodeIds = await this.readySuccessorNodeIds(execution, nodeId);
		if (readyNodeIds.length === 0) return 0;

		// Planned together so a fan-out is one round trip, and published only after
		// the rows exist, so a consumer can always load the step. A step another
		// planner got to first isn't returned, so it isn't announced twice either.
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
	 * Records the execution's outcome once no step is left to run: `failed` if any
	 * step failed, `completed` otherwise.
	 *
	 * TODO(CAT-3910): "nothing queued or running" has a false-empty window — a step
	 * can be completed while its successors are not yet planned — so a concurrent
	 * handler can finish the execution early. Unreachable while the queue dispatches
	 * sequentially.
	 */
	private async finishIfDone(executionId: string): Promise<void> {
		if (await this.stepStore.hasActiveSteps(executionId)) return;

		const failed = await this.stepStore.hasFailedSteps(executionId);
		await this.executionStore.finishExecution(executionId, failed ? 'failed' : 'completed');
	}

	/** Successors of `nodeId` whose every predecessor has completed. */
	private async readySuccessorNodeIds(
		execution: ExecutionRecord,
		nodeId: string,
	): Promise<string[]> {
		const successors = getSuccessorNodeIds(execution.graph, nodeId).map((id) => ({
			id,
			predecessorIds: getPredecessorNodeIds(execution.graph, id),
		}));

		// One query covering every predecessor in play; readiness is then set
		// membership, so a fan-out costs a single round trip.
		const completed = await this.stepStore.loadCompletedNodeIds(
			execution.id,
			successors.flatMap(({ predecessorIds }) => predecessorIds),
		);

		return successors
			.filter(({ predecessorIds }) => predecessorIds.every((id) => completed.has(id)))
			.map(({ id }) => id);
	}
}
