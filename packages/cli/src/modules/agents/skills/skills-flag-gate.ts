import { SKILLS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { PostHogClient } from '@/posthog';

/**
 * Per-user rollout gate for skills. `PostHogClient` caches the flags per user and
 * applies `N8N_FEATURE_FLAG_OVERRIDES`, also when PostHog is unreachable.
 */
@Service()
export class SkillsFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		return flags?.[SKILLS_FLAG] === true;
	}

	/** 404, not 403: with the flag off, skills look unknown, not forbidden. */
	async assertEnabled(user: User): Promise<void> {
		if (!(await this.isEnabled(user))) throw new NotFoundError('Not found');
	}
}
