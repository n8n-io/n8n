import { Logger } from '@n8n/backend-common';
import { SchedulerConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { SweepStore } from './sweep-store';
import { DEFAULT_SWEEP_OPTIONS, sweep } from '../core/sweep';
import type { SweepOptions, SweepSummary } from '../core/sweep';

/**
 * This is the entry the lifecycle wiring drives on a timer; it does not schedule itself.
 * TODO TEMPORARY implementation and exposure of this package
 */
@Service()
export class SchedulerService {
	private readonly options: SweepOptions;

	constructor(
		private readonly store: SweepStore,
		private readonly logger: Logger,
		config: SchedulerConfig,
	) {
		this.options = {
			...DEFAULT_SWEEP_OPTIONS,
			windowSeconds: config.materializationWindow,
		};
	}

	async runSweep(): Promise<SweepSummary> {
		return await sweep(this.store.runInTransaction, this.options, (job, error) => {
			this.logger.error('Scheduler could not plan a job schedule; deferred for retry', {
				jobId: job.id,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}
}
