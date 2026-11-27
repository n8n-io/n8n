import type { StepStore } from '../execution';
import type { Detector, Finding } from './reconciliation.types';

/**
 * Finds the settled steps that still have their `stale_after` time after that
 * time. The orchestration worker clears the time after it handles the
 * `step:settled` message of the step, so the message of such a step was lost,
 * or the orchestration worker has not handled it yet.
 */
export class SettledStepDetector implements Detector {
	readonly name = 'settled-step';

	constructor(
		private readonly stepStore: StepStore,
		readonly intervalMs: number,
		private readonly batchSize: number,
	) {}

	async detect(at: Date): Promise<Finding[]> {
		const steps = await this.stepStore.findStaleSettledSteps(at, this.batchSize);
		return steps.map(({ id, executionId, staleAfter }) => ({
			kind: 'step-settled-no-message',
			stepId: id,
			executionId,
			staleAfter,
		}));
	}
}
