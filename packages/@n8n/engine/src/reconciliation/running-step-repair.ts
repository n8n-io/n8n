import {
	announceStepFailed,
	isLiveExecutionStatus,
	validateStepContext,
	type ExecutionRecord,
	type ExecutionStore,
	type StepError,
	type StepRecord,
	type StepStore,
} from '../execution';
import type { GraphNode } from '../graph';
import type { LifecycleEventPublisherFactory } from '../lifecycle-events';
import type { OrchestrationMessage, StepMessage, WorkQueue } from '../queue';
import type { Finding, Repair } from './reconciliation.types';

type Kind = 'step-running-no-worker';

/** The name of the error on a step that the repair failed. */
export const STALE_RUNNING_STEP_ERROR_NAME = 'StaleRunningStepError';

/** How many times the engine runs a step whose node is idempotent, the first run included. */
export const DEFAULT_MAX_STEP_ATTEMPTS = 3;

/** Why the repair does not queue the step again. `undefined` when it does. */
type NoRetryReason = 'not-idempotent' | 'no-attempt-left' | 'execution-ended';

const NO_RETRY_EXPLANATIONS: Record<NoRetryReason, (step: StepRecord) => string> = {
	'not-idempotent': () =>
		'The engine did not run it again, because a second run can repeat its side effects.',
	'no-attempt-left': ({ attempt }) => `The engine stopped after attempt ${attempt}.`,
	'execution-ended': () => 'The engine did not run it again, because its execution already ended.',
};

function staleRunningStepError(
	node: GraphNode,
	step: StepRecord,
	reason: NoRetryReason,
): StepError {
	return {
		name: STALE_RUNNING_STEP_ERROR_NAME,
		message: `The node "${node.name}" did not finish in time. ${NO_RETRY_EXPLANATIONS[reason](step)}`,
	};
}

/**
 * Repairs a step that is still `running` after its `stale_after` time. The
 * worker of such a step stopped, or the node is slow.
 *
 * A step of an idempotent node goes back to `queued`, and the repair publishes
 * `step:ready` to the step queue, until the step has no attempt left. Every
 * other step fails, and the repair announces the failure as the step worker
 * does. `StepSettledHandler` then fails the execution.
 *
 * A worker that is only slow finds another status or another attempt when it
 * writes its outcome, and announces nothing.
 */
export class RunningStepRepair implements Repair<Kind> {
	readonly kind = 'step-running-no-worker';

	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
		private readonly lifecycleEventPublisherFactory: LifecycleEventPublisherFactory,
		private readonly maxAttempts: number = DEFAULT_MAX_STEP_ATTEMPTS,
	) {}

	async apply({ stepId, staleAfter }: Extract<Finding, { kind: Kind }>): Promise<boolean> {
		const step = await this.stepStore.loadStep(stepId);
		const execution = await this.executionStore.loadExecution(step.executionId);
		const node = validateStepContext(step, execution);

		const noRetryReason = this.noRetryReason(execution, step, node);
		if (noRetryReason === undefined) {
			const requeued = await this.stepStore.requeueStaleRunningStep(stepId, staleAfter);
			if (!requeued) return false;

			// A crash here leaves the step `queued` with no message. The repair of a
			// stale `queued` step publishes the message.
			await this.stepQueue.publish({ type: 'step:ready', executionId: execution.id, stepId });
			return true;
		}

		const error = staleRunningStepError(node, step, noRetryReason);
		const failed = await this.stepStore.failStaleRunningStep(stepId, staleAfter, error);
		if (!failed) return false;

		await announceStepFailed(
			this.lifecycleEventPublisherFactory,
			this.orchestrationQueue,
			execution,
			step,
			node,
			error,
		);
		return true;
	}

	private noRetryReason(
		execution: ExecutionRecord,
		step: StepRecord,
		node: GraphNode,
	): NoRetryReason | undefined {
		if (node.idempotent !== true) return 'not-idempotent';
		if (step.attempt >= this.maxAttempts) return 'no-attempt-left';
		// No worker runs a step of an ended execution, and `claimStep` refuses
		// every step of an execution that has a failed step.
		if (!isLiveExecutionStatus(execution.status)) return 'execution-ended';
		return undefined;
	}
}
