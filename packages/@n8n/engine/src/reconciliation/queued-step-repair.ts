import type { StepStore } from '../execution';
import type { StepMessage, WorkQueue } from '../queue';
import type { Finding, Repair } from './reconciliation.types';

type Kind = 'step-queued-no-message';

/**
 * Publishes `step:ready` to the step queue again for a step that is still
 * `queued`.
 *
 * A second event for a step whose first event is only slow does no harm: the
 * step worker claims the step with a compare-and-set, so it ignores the event
 * that arrives second.
 */
export class QueuedStepRepair implements Repair<Kind> {
	readonly kind = 'step-queued-no-message';

	constructor(
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
	) {}

	async apply({
		stepId,
		executionId,
		staleAfter,
	}: Extract<Finding, { kind: Kind }>): Promise<boolean> {
		// The renewal moves `stale_after` forward, so the detector does not return
		// this step again before the new event had time to be handled.
		const renewed = await this.stepStore.renewQueuedStep(stepId, staleAfter);
		if (!renewed) return false;

		await this.stepQueue.publish({ type: 'step:ready', executionId, stepId });
		return true;
	}
}
