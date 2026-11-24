import { SKILL_SYNC_FLAG } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { SkillSyncSettingsService } from './skill-sync-settings.service';
import { SkillsGate } from './skills-gate';

/**
 * Whether a user can use Skill Sync: skills are on, the admin switch is on, and the per-user
 * PostHog flag `SKILL_SYNC_FLAG` is on. `PostHogClient` caches per user and applies the local
 * overrides, so this gate needs no cache of its own.
 */
@Service()
export class SkillSyncFlagGate {
	constructor(
		private readonly skillsGate: SkillsGate,
		private readonly postHog: PostHogClient,
		private readonly skillSyncSettings: SkillSyncSettingsService,
	) {}

	async isEnabled(user: User): Promise<boolean> {
		if (!this.isAvailable) return false;
		return this.isEnabledForFlags(await this.postHog.getFeatureFlags(user));
	}

	isEnabledForFlags(flags: Awaited<ReturnType<PostHogClient['getFeatureFlags']>>): boolean {
		return flags?.[SKILL_SYNC_FLAG] === true && this.isAvailable;
	}

	/**
	 * The instance part of the gate: skills and the Skill Sync switch, without the flag of a
	 * user. For a caller that has no user, such as the MCP consent screen.
	 */
	get isAvailable(): boolean {
		return this.skillsGate.isEnabled && this.skillSyncSettings.isEnabled();
	}

	// 404, not 403: a surface behind a flag that is off looks unknown, not forbidden.
	async assertEnabled(user: User): Promise<void> {
		if (!(await this.isEnabled(user))) throw new NotFoundError('Not found');
	}
}
