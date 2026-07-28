import { AGENT_EVALS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { PostHogClient } from '@/posthog';

/**
 * Per-user rollout gate for every agent-eval surface.
 *
 * PostHog is the source of truth for cohort rollout, so the flag is resolved per
 * user rather than per instance; `N8N_AGENT_EVALS_ENABLED` still force-enables it
 * because {@link PostHogClient} layers that override on top of the resolved
 * flags. A rolled-out user therefore needs no env var, and an operator can still
 * switch the feature on for a whole instance.
 *
 * Shared by the controller and the services behind it so the routes and the
 * business logic can't drift on what "enabled" means. Resolution is cheap to
 * repeat: `getFeatureFlags` caches per user, and it degrades to the env
 * overrides on its own when PostHog is unreachable — so no error handling is
 * needed here, and an outage reads as flag-off rather than failing the request.
 */
@Service()
export class AgentEvalsFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		return flags?.[AGENT_EVALS_FLAG] === true;
	}

	/**
	 * Throws `NotFoundError` rather than `ForbiddenError` when the flag is off, so
	 * the surface looks like an unknown feature and leaks no flag state.
	 */
	async assertEnabled(user: User): Promise<void> {
		if (!(await this.isEnabled(user))) throw new NotFoundError('Not found');
	}
}
