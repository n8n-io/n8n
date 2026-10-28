import type { LifecycleEventPublisher } from '../lifecycle-events';
import type { StepMessage, WorkQueue } from '../queue';
import type { ExecutionResponseSender } from '../response-channel';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { ExecutionStatus } from './execution.types';
import type { StepStore } from './step-store';

export interface CancelExecutionResult {
	/** The execution's status after the request: `cancelled` unless it had already ended. */
	status: ExecutionStatus;
	/** When the execution ended. Set whenever `status` is not live. */
	finishedAt: Date | null;
}

/**
 * Ends an execution on request. No more steps will be planned. A sub-execution
 * cancelled on its own resumes the step that waits for it, so that step fails
 * instead of waiting for ever.
 * TODO(CAT-4757): interrupt already-running steps through their executor.
 */
export class CancelExecutionService {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly lifecycleEventPublisher: LifecycleEventPublisher,
		private readonly responseSender: ExecutionResponseSender,
		private readonly stepQueue: WorkQueue<StepMessage>,
	) {}

	/** @throws {ExecutionNotFoundError} if absent. */
	async cancel(executionId: string): Promise<CancelExecutionResult> {
		const cancelled = await this.executionStore.cancelExecution(executionId);
		// Loaded after the compare-and-set, so a lost race reports the status that won.
		const execution = await this.executionStore.loadExecution(executionId);

		if (cancelled) {
			await this.stepStore.cancelPendingSteps(executionId);
			// Only the request whose write won announces the end.
			this.lifecycleEventPublisher.publish({
				type: 'execution:cancelled',
				executionId,
				workflowId: execution.workflowId,
				at: cancelled.finishedAt.toISOString(),
			});
			// Releases whoever waits on the run. No step settled, so there is no last step.
			if (execution.responseExpectation.kind !== 'none') {
				this.responseSender.send({
					type: 'ended',
					executionId,
					workflowId: execution.workflowId,
					status: 'cancelled',
					lastStep: null,
				});
			}
			await this.resumeAwaitingParent(execution);
		}

		return { status: execution.status, finishedAt: execution.finishedAt };
	}

	/**
	 * A parent step that waits for this execution is resumed with the
	 * cancellation, so it fails rather than waits for ever. When the parent
	 * ended first, its step is cancelled already and the resume is a no-op.
	 */
	private async resumeAwaitingParent(execution: ExecutionRecord): Promise<void> {
		const { parent } = execution;
		if (!parent?.awaited) return;

		const resumed = await this.stepStore.resumeStep(parent.stepId, {
			kind: 'subExecution',
			executionId: execution.id,
			status: 'cancelled',
			error: {
				name: 'ExecutionCancelledError',
				message: `Execution ${execution.id} was cancelled`,
			},
		});
		if (!resumed) return;

		await this.stepQueue.publish({
			type: 'step:ready',
			executionId: parent.executionId,
			stepId: parent.stepId,
		});
		await this.executionStore.refreshLiveStatus(parent.executionId);
	}
}
