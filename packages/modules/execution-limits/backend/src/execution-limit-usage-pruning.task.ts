import { Logger } from '@n8n/backend-common';
import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { ExecutionLimitUsageRepository } from './execution-limit-usage.repository';
import { ExecutionLimitsConfig } from './execution-limits.config';
import { addUtcDays, toUtcDay } from './execution-usage-period';

/** Deletes the usage rows that are older than the retention, in the two usage tables. */
@SystemTask()
export class ExecutionLimitUsagePruningTask implements SystemTask {
	readonly name = 'execution-limit-usage-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.days.toSeconds);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// The two DELETEs ignore the signal, so the run must outlast both statement timeouts.
			timeoutSeconds: timeoutAfterLimit(
				2 * statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
		// oxlint-disable-next-line typescript/no-deprecated -- Keep timer scheduling while the durable scheduler is disabled.
		leaderTimer: {
			// A main that restarts more often than one time a day must prune too.
			runOnTakeover: true,
		},
	});

	constructor(
		private readonly config: ExecutionLimitsConfig,
		private readonly databaseConfig: DatabaseConfig,
		private readonly repository: ExecutionLimitUsageRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	async run(): Promise<void> {
		const cutoffDay = addUtcDays(toUtcDay(new Date()), -this.config.usageRetentionDays);

		const deleted = await this.repository.deleteUsageBefore(cutoffDay, {});

		if (deleted.projectRows + deleted.instanceRows > 0) {
			this.logger.debug('Pruned old execution limit usage rows', { cutoffDay, ...deleted });
		}
	}
}
