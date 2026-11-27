import { WORKFLOWS_IN_SKILLS_ENABLED_VARIANT, WORKFLOWS_IN_SKILLS_FLAG } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { SkillsGate } from './skills-gate';

@Service()
export class WorkflowsInSkillsFlagGate {
	constructor(
		private readonly skillsGate: SkillsGate,
		private readonly postHog: PostHogClient,
	) {}

	async isEnabled(): Promise<boolean> {
		return (
			this.skillsGate.isEnabled &&
			(await this.postHog.getFeatureFlagForInstance(WORKFLOWS_IN_SKILLS_FLAG)) ===
				WORKFLOWS_IN_SKILLS_ENABLED_VARIANT
		);
	}
}
