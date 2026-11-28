import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { AssistantUsageService } from './assistant-usage.service';

/** Deletes n8n Assistant usage records past the retention period, once a day. */
@SystemTask()
export class AssistantUsagePruningTask implements SystemTask {
	readonly name = 'assistant-usage-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.days.toSeconds);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// One DELETE that ignores the signal, so the run waits for the statement timeout.
			timeoutSeconds: timeoutAfterLimit(
				statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
		leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
	});

	constructor(
		private readonly databaseConfig: DatabaseConfig,
		private readonly usageService: AssistantUsageService,
	) {}

	async run(): Promise<void> {
		await this.usageService.pruneOldEvents();
	}
}
