import type { LifecycleEventPublisherFactory } from '../lifecycle-events';
import type { StepMessage, WorkQueuePublisher } from '../queue';
import type { ExecutionResponseSender } from '../response-channel';
import type { ExecutionStore } from './execution-store';
import type { ExecutionStatus } from './execution.types';
import type { StepStore } from './step-store';
import { resumeAwaitingParent } from './sub-execution-resume';

export interface CancelExecutionResult {
	/** The execution's status after the request: `cancelled` unless it had already ended. */
	status: ExecutionStatus;
	/** When the execution ended. Set whenever `status` is not live. */
	finishedAt: Date | null;
}

/**
 * Ends an execution on request. No more steps will be planned, and every
 * sub-execution that has not ended is cancelled with it, whether or not a
 * step waits for it.
 * TODO(CAT-4757): interrupt already-running steps through their executor.
 */
export class CancelExecutionService {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly lifecycleEventPublisherFactory: LifecycleEventPublisherFactory,
		private readonly responseSender: ExecutionResponseSender,
		private readonly stepQueue: WorkQueuePublisher<StepMessage>,
	) {}

	/** @throws {ExecutionNotFoundError} if absent. */
	async cancel(executionId: string): Promise<CancelExecutionResult> {
		const cancelled = await this.executionStore.cancelExecution(executionId);
		// Loaded after the compare-and-set, so a lost race reports the status that won.
		const execution = await this.executionStore.loadExecution(executionId);

		if (cancelled) {
			await this.stepStore.cancelPendingSteps(executionId);
			// Only the request whose write won announces the end.
			this.lifecycleEventPublisherFactory.create(execution).publish({
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
			// So a parent step that waits for this execution fails rather than waits for ever.
			const { executionStore, stepStore, stepQueue } = this;
			await resumeAwaitingParent({ executionStore, stepStore, stepQueue }, execution, {
				status: 'cancelled',
				error: {
					name: 'ExecutionCancelledError',
					message: `Execution ${execution.id} was cancelled`,
				},
			});
			await this.cancelSubExecutions(executionId);
		}

		return { status: execution.status, finishedAt: execution.finishedAt };
	}

	/**
	 * Cancels every sub-execution of the execution that has not ended, and through each
	 * of them their own sub-executions. The nesting depth bounds the recursion.
	 *
	 * A sub-execution whose cancel throws does not stop the others. The errors
	 * are thrown together once every sub-execution has been tried.
	 */
	async cancelSubExecutions(parentExecutionId: string): Promise<void> {
		const errors: unknown[] = [];
		for (const id of await this.executionStore.loadLiveSubExecutionIds(parentExecutionId)) {
			try {
				await this.cancel(id);
			} catch (error) {
				errors.push(error);
			}
		}
		if (errors.length > 0) {
			throw new AggregateError(
				errors,
				`Cancelling the sub-executions of execution ${parentExecutionId} failed`,
			);
		}
	}
}
