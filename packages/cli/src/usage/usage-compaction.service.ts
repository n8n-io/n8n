import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { DbLock, DbLockService, UsageRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { startOfUtcDay } from './usage-aggregation';
import { UsageConfig } from './usage.config';

/** Rolls hourly grid rows older than the retention window into daily rows, one UTC day at a time. */
@Service()
export class UsageCompactionService {
	constructor(
		private readonly logger: Logger,
		private readonly dbLockService: DbLockService,
		private readonly usageRepository: UsageRepository,
		private readonly usageConfig: UsageConfig,
	) {
		this.logger = this.logger.scoped('usage');
	}

	/** Returns how many hourly rows were rolled up. */
	async compact(signal?: AbortSignal, now = new Date()): Promise<number> {
		const { hourlyRetentionDays } = this.usageConfig;
		// 0 keeps hourly rows forever, so a config typo cannot drop the hourly view.
		if (hourlyRetentionDays <= 0) return 0;

		const cutoff = startOfUtcDay(
			new Date(now.getTime() - hourlyRetentionDays * Time.days.toMilliseconds),
		);
		let compacted = 0;
		while (!signal?.aborted) {
			const oldest = await this.usageRepository.oldestHourBefore(cutoff);
			if (!oldest) break;

			const day = startOfUtcDay(oldest);
			try {
				// The fold's lock, so the two never write the grid at the same time.
				compacted += await this.dbLockService.tryWithLock(
					DbLock.WORKFLOW_STATISTICS_ROLLUP,
					async (tx) => await this.usageRepository.compactHoursOfDay(tx, day),
				);
			} catch (error) {
				// The fold holds the lock; the next run picks up where this one stopped.
				if (error instanceof OperationalError) break;
				throw error;
			}
		}
		if (compacted > 0) this.logger.debug(`Rolled ${compacted} hourly usage rows into days`);
		return compacted;
	}
}
