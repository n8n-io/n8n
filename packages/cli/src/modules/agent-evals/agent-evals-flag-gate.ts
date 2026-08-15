import { AGENT_EVALS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { PostHogClient } from '@/posthog';

/**
 * Per-user rollout gate for every agent-eval surface, shared by the controller
 * and the services behind it so the two can't disagree on what "enabled" means.
 *
 * PostHog owns cohort rollout; `N8N_AGENT_EVALS_ENABLED` still force-enables
 * because {@link PostHogClient} layers that override on top of the resolved
 * flags. It also caches per user and falls back to those overrides when PostHog
 * is unreachable, so this needs no caching or error handling of its own.
 */
@Service()
export class AgentEvalsFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		return flags?.[AGENT_EVALS_FLAG] === true;
	}

	// 404 rather than 403: a flag-off surface should look unknown, not forbidden.
	async assertEnabled(user: User): Promise<void> {
		if (!(await this.isEnabled(user))) throw new NotFoundError('Not found');
	}
}
