import { ASSISTANT_SKILLS_FLAG } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

import { SkillsGate } from './skills-gate';

/**
 * Whether n8n Assistant can use skills: skills are on, and the instance flag
 * `ASSISTANT_SKILLS_FLAG` is on. The flag switches Assistant skills separately from skills.
 */
@Service()
export class AssistantSkillsFlagGate {
	constructor(
		private readonly skillsGate: SkillsGate,
		private readonly postHog: PostHogClient,
	) {}

	async isEnabled(): Promise<boolean> {
		return (
			this.skillsGate.isEnabled &&
			(await this.postHog.getFeatureFlagForInstance(ASSISTANT_SKILLS_FLAG)) === true
		);
	}
}
