import {
	announceStepFailed,
	validateStepContext,
	type ExecutionStore,
	type StepError,
	type StepStore,
} from '../execution';
import type { GraphNode } from '../graph';
import type { LifecycleEventPublisherFactory } from '../lifecycle-events';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { Finding, Repair } from './reconciliation.types';

type Kind = 'step-running-no-worker';

/** The name of the error on a step that the repair failed. */
export const STALE_RUNNING_STEP_ERROR_NAME = 'StaleRunningStepError';

function staleRunningStepError(node: GraphNode): StepError {
	return {
		name: STALE_RUNNING_STEP_ERROR_NAME,
		message: `The node "${node.name}" was still running after its stale time. The engine did not run it again, because a second run can repeat its side effects.`,
	};
}

/**
 * Fails a step that is still `running`, and announces the failure as the step
 * worker does. `StepSettledHandler` then fails the execution.
 *
 * The step is never run again here. A worker that is only slow finds a status
 * that is not `running` when it writes its outcome, and announces nothing.
 */
export class RunningStepRepair implements Repair<Kind> {
	readonly kind = 'step-running-no-worker';

	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
		private readonly lifecycleEventPublisherFactory: LifecycleEventPublisherFactory,
	) {}

	async apply({ stepId, staleAfter }: Extract<Finding, { kind: Kind }>): Promise<boolean> {
		const step = await this.stepStore.loadStep(stepId);
		const execution = await this.executionStore.loadExecution(step.executionId);
		const node = validateStepContext(step, execution);

		const failed = await this.stepStore.failStaleRunningStep(
			stepId,
			staleAfter,
			staleRunningStepError(node),
		);
		if (!failed) return false;

		await announceStepFailed(
			this.lifecycleEventPublisherFactory,
			this.orchestrationQueue,
			execution,
			step,
			node,
		);
		return true;
	}
}
