import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowHistoryCompactionService } from './workflow-history-compaction.service';

/**
 * Trims long-running workflow histories down to one version per time bucket,
 * so old histories keep their shape without keeping every auto-save.
 */
@SystemTask()
export class WorkflowHistoryCompactionTrimTask implements SystemTask {
	readonly name = 'workflow-history-compaction-trim';

	readonly schedule: SystemTaskSchedule = {
		kind: 'cron',
		cronExpression: '0 3 * * *',
		// `null` resolves to `GENERIC_TIMEZONE` at run time.
		timezone: null,
	};

	readonly target = {
		scope: 'cluster',
		scheduler: {
			maxAttempts: 3,
			// A late run on the same day reads the same window, so an hour carries the
			// occurrence across a restart at 03:00 instead of losing the day's trim.
			missedAfterSeconds: Time.hours.toSeconds,
			// Runs the same pass as the optimize task, over a window many times wider.
			timeoutSeconds: Time.hours.toSeconds,
		},
	} satisfies SystemTaskTarget;

	constructor(private readonly compactionService: WorkflowHistoryCompactionService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.compactionService.trimLongRunningHistories(signal);
	}
}
