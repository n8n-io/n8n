import { FLEXIBLE_GROUPS_CANVAS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

/**
 * Per-user rollout gate for the flexible canvas groups. The canvas reads the
 * same flag for the same user, so a group the canvas accepts also passes the
 * save path.
 *
 * PostHog owns cohort rollout; `N8N_WORKFLOWS_FLEXIBLE_GROUPS_ENABLED` still
 * force-enables because {@link PostHogClient} layers that override on top of
 * the resolved flags. It also caches per user and swallows PostHog errors, so
 * this needs no caching or error handling of its own.
 */
@Service()
export class FlexibleGroupsFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		return flags?.[FLEXIBLE_GROUPS_CANVAS_FLAG] === true;
	}
}
