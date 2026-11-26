import type { StepStore } from '../execution';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { Finding, Repair } from './reconciliation.types';

type Kind = 'step-settled-no-message';

/**
 * Publishes `step:settled` to the orchestration queue again for a settled step
 * that the orchestration worker did not acknowledge.
 *
 * A second message for a step whose first message is only slow does no harm.
 * `StepSettledHandler` creates each successor row one time, and it ends an
 * execution with a compare-and-set.
 *
 * The repair publishes no lifecycle event. The writer of the outcome publishes
 * the lifecycle event of the step before it publishes `step:settled`.
 */
export class SettledStepRepair implements Repair<Kind> {
	readonly kind = 'step-settled-no-message';

	constructor(
		private readonly stepStore: StepStore,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
	) {}

	async apply({
		stepId,
		executionId,
		staleAfter,
	}: Extract<Finding, { kind: Kind }>): Promise<boolean> {
		// The renewal moves `stale_after` forward, so the detector does not return
		// this step again before the new message had time to be handled.
		const renewed = await this.stepStore.renewSettledStep(stepId, staleAfter);
		if (!renewed) return false;

		await this.orchestrationQueue.publish({ type: 'step:settled', executionId, stepId });
		return true;
	}
}
