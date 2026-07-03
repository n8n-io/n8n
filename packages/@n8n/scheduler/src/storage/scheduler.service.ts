import { Logger } from '@n8n/backend-common';
import { SchedulerConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { MaterializerStore } from './materializer-store';
import { DEFAULT_MATERIALIZER_OPTIONS, materialize } from '../core/materializer';
import type { MaterializerOptions, MaterializerSummary } from '../core/materializer';

/**
 * This is the entry the lifecycle wiring drives on a timer; it does not schedule itself.
 * TODO TEMPORARY implementation and exposure of this package
 */
@Service()
export class SchedulerService {
	private readonly options: MaterializerOptions;

	constructor(
		private readonly store: MaterializerStore,
		private readonly logger: Logger,
		config: SchedulerConfig,
	) {
		this.options = {
			...DEFAULT_MATERIALIZER_OPTIONS,
			windowSeconds: config.materializationWindowSeconds,
		};
	}

	async materialize(): Promise<MaterializerSummary> {
		return await materialize(this.store.runInTransaction, this.options, (job, error) => {
			this.logger.error('Scheduler could not plan a job schedule; deferred for retry', {
				jobId: job.id,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}
}
