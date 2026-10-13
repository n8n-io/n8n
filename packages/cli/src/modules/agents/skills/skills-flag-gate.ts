import { SKILLS_FLAG } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { PostHogClient } from '@/posthog';

/**
 * Rollout gate for skills, one answer for the whole instance: skills are shared, so two
 * users of one instance must not see them differently, and agents that run without a
 * user read the same answer. `PostHogClient` caches the result and applies
 * `N8N_FEATURE_FLAG_OVERRIDES`, also when PostHog is unreachable.
 */
@Service()
export class SkillsFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(): Promise<boolean> {
		return (await this.postHogClient.getFeatureFlagForInstance(SKILLS_FLAG)) === true;
	}

	/** 404, not 403: with the flag off, skills look unknown, not forbidden. */
	async assertEnabled(): Promise<void> {
		if (!(await this.isEnabled())) throw new NotFoundError('Not found');
	}
}
