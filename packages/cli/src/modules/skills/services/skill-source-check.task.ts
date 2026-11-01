import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { SkillSyncService } from './skill-sync.service';
import { SkillSyncConfig } from '../skill-sync.config';

/**
 * Checks every skill source for updates, once an hour by default, on one main. A check
 * stores updates that wait for review. It changes no skill.
 */
@SystemTask()
export class SkillSourceCheckTask implements SystemTask {
	readonly name = 'skill-source-check';

	readonly schedule: SystemTaskSchedule;

	readonly target = clusterTarget({
		// A failed run is not retried: the next run checks every source again. A run may take
		// half an hour, and the sources it did not reach go first next time.
		scheduler: { retryOnFailure: false, timeoutSeconds: 30 * Time.minutes.toSeconds },
		leaderTimer: {},
	});

	constructor(
		config: SkillSyncConfig,
		private readonly skillSync: SkillSyncService,
	) {
		this.schedule = intervalFromSeconds(config.checkIntervalSeconds);
	}

	async run(signal: AbortSignal): Promise<void> {
		await this.skillSync.checkAll(signal);
	}
}
