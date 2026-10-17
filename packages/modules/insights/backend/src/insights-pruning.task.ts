import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { InsightsPruningService } from './insights-pruning.service';
import { InsightsConfig } from './insights.config';

/**
 * Deletes insights statistics older than the configured retention period, so
 * old data does not pile up forever.
 */
@SystemTask()
export class InsightsPruningTask implements SystemTask {
	readonly name = 'insights-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		this.insightsConfig.pruneCheckIntervalHours * Time.hours.toSeconds,
	);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// One DELETE that ignores the signal. A timeout that stops the run before the
			// DELETE ends lets the next run start a second one, so it waits for the
			// statement timeout first.
			timeoutSeconds: timeoutAfterLimit(
				statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
		leaderTimer: { retryDelaySeconds: 1 },
	});

	constructor(
		private readonly insightsConfig: InsightsConfig,
		private readonly databaseConfig: DatabaseConfig,
		private readonly pruningService: InsightsPruningService,
	) {}

	async run(): Promise<void> {
		await this.pruningService.pruneInsights();
	}
}
