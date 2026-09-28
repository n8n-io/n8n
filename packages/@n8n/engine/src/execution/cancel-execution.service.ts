import type { LifecycleEventPublisher } from '../lifecycle-events';
import type { ExecutionResponseSender } from '../response-channel';
import type { ExecutionStore } from './execution-store';
import type { ExecutionStatus } from './execution.types';
import type { StepStore } from './step-store';

export interface CancelExecutionResult {
	/** The execution's status after the request: `cancelled` unless it had already ended. */
	status: ExecutionStatus;
}

/**
 * Ends an execution on request. No more steps will be planned.
 * TODO(CAT-4757): interrupt already-running steps through their executor.
 */
export class CancelExecutionService {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly lifecycleEventPublisher: LifecycleEventPublisher,
		private readonly responseSender: ExecutionResponseSender,
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
				at: new Date().toISOString(),
			});
			// Releases whoever waits on the run. No step settled, so there is no last step.
			this.responseSender.send({
				type: 'ended',
				executionId,
				workflowId: execution.workflowId,
				status: 'cancelled',
				lastStep: null,
			});
		}

		return { status: execution.status };
	}
}
