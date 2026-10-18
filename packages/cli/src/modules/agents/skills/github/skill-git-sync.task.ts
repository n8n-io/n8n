import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { SkillsHubRollout } from '../skills-hub-rollout';
import { SkillGitSyncService } from './skill-git-sync.service';

/**
 * Checks the GitHub folders of synced skills for new commits. Without a token GitHub
 * allows 60 API calls an hour for each IP address, so the check runs every few hours and
 * costs one call for each repository and branch that did not change.
 */
@SystemTask()
export class SkillGitSyncTask implements SystemTask {
	readonly name = 'skill-git-sync';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(3 * Time.hours.toSeconds);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: false, timeoutSeconds: 10 * Time.minutes.toSeconds },
		leaderTimer: { runOnTakeover: false, retryDelaySeconds: 300 },
	});

	constructor(
		private readonly rollout: SkillsHubRollout,
		private readonly sync: SkillGitSyncService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		if (!this.rollout.isEnabled) return;
		await this.sync.checkAll(signal);
	}
}
