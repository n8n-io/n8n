import { RECOMMENDED_SKILLS_FLAG } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

@Service()
export class RecommendedSkillsFlagGate {
	constructor(private readonly postHog: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		return (await this.postHog.getFeatureFlags(user))?.[RECOMMENDED_SKILLS_FLAG] === 'variant';
	}
}
