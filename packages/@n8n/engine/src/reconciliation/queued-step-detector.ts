import type { StepStore } from '../execution';
import type { Detector, Finding } from './reconciliation.types';

/**
 * Finds the steps that are still `queued` after their `stale_after` time. The
 * `step:ready` event of such a step was lost, or the step worker has not
 * handled it yet.
 */
export class QueuedStepDetector implements Detector {
	readonly name = 'queued-step';

	constructor(
		private readonly stepStore: StepStore,
		readonly intervalMs: number,
		private readonly batchSize: number,
	) {}

	async detect(at: Date): Promise<Finding[]> {
		const steps = await this.stepStore.findStaleQueuedSteps(at, this.batchSize);
		return steps.map(({ id, executionId, staleAfter }) => ({
			kind: 'step-queued-no-message',
			stepId: id,
			executionId,
			staleAfter,
		}));
	}
}
