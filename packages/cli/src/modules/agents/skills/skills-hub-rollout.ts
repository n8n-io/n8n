import { SKILLS_FLAG } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

/**
 * Whether agents use the skills hub, from the PostHog flag `125_context_skills` for the
 * instance. `init` reads the flag once at startup and the value holds for the life of the
 * process, so the startup copy and every read agree. A change needs a restart. PostHog
 * down or diagnostics off means off, unless `N8N_FEATURE_FLAG_OVERRIDES` turns it on.
 */
@Service()
export class SkillsHubRollout {
	private enabled = false;

	constructor(
		private readonly postHogClient: PostHogClient,
		private readonly logger: Logger,
	) {}

	async init(): Promise<void> {
		this.enabled = (await this.postHogClient.getFeatureFlagForInstance(SKILLS_FLAG)) === true;
		this.logger.debug('Read the skills hub rollout flag', { enabled: this.enabled });
	}

	get isEnabled(): boolean {
		return this.enabled;
	}
}
