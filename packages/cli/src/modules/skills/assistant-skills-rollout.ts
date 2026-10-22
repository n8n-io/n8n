import { ASSISTANT_SKILLS_FLAG } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

import { SkillsHubRollout } from './skills-hub-rollout';

@Service()
export class AssistantSkillsRollout {
	constructor(
		private readonly skillsHubRollout: SkillsHubRollout,
		private readonly postHog: PostHogClient,
	) {}

	async isEnabled(): Promise<boolean> {
		return (
			this.skillsHubRollout.isEnabled &&
			(await this.postHog.getFeatureFlagForInstance(ASSISTANT_SKILLS_FLAG)) === true
		);
	}
}
