import type { StepStore } from '../execution';
import type { Detector, Finding } from './reconciliation.types';

/**
 * Finds the steps that are still `running` after their `stale_after` time. The
 * worker of such a step stopped, or the node runs longer than the threshold.
 * The detector cannot tell the two cases apart.
 */
export class RunningStepDetector implements Detector {
	readonly name = 'running-step';

	constructor(
		private readonly stepStore: StepStore,
		readonly intervalMs: number,
		private readonly batchSize: number,
	) {}

	async detect(at: Date): Promise<Finding[]> {
		const steps = await this.stepStore.findStaleRunningSteps(at, this.batchSize);
		return steps.map(({ id, staleAfter }) => ({
			kind: 'step-running-no-worker',
			stepId: id,
			staleAfter,
		}));
	}
}
