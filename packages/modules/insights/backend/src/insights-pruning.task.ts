import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

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

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = { scope: 'cluster', durable: true };

	/** Only the in-memory timer, which runs whenever the task does not run durably, honors this. */
	readonly retryDelaySeconds = 1;

	// One DELETE that ignores the signal. A timeout that stops the run before the
	// DELETE ends lets the next run start a second one, so it waits for the
	// statement timeout first.
	readonly timeoutSeconds = timeoutAfterLimit(
		statementTimeoutSeconds(this.databaseConfig),
		5 * Time.minutes.toSeconds,
	);

	constructor(
		private readonly insightsConfig: InsightsConfig,
		private readonly databaseConfig: DatabaseConfig,
		private readonly pruningService: InsightsPruningService,
	) {}

	async run(): Promise<void> {
		await this.pruningService.pruneInsights();
	}
}
