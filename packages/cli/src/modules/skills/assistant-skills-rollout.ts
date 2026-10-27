import { ASSISTANT_SKILLS_FLAG } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

import { SkillAgentsProxy } from './skill-agents-proxy.service';

@Service()
export class AssistantSkillsRollout {
	constructor(
		private readonly skillAgents: SkillAgentsProxy,
		private readonly postHog: PostHogClient,
	) {}

	async isEnabled(): Promise<boolean> {
		return (
			this.skillAgents.hasProvider &&
			(await this.postHog.getFeatureFlagForInstance(ASSISTANT_SKILLS_FLAG)) === true
		);
	}
}
