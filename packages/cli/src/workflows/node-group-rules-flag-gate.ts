import { GROUPS_WITH_MANY_BOUNDARIES_FLAG, GROUPS_WITH_TRIGGERS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { NodeGroupRuleOptions } from 'n8n-workflow';

import { PostHogClient } from '@/posthog';

/**
 * Per-user gate for the two relaxed node group rules.
 *
 * {@link PostHogClient} caches per user, swallows PostHog errors and layers the
 * env-var overrides on top, so this needs none of that of its own.
 */
@Service()
export class NodeGroupRulesFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	/** One PostHog read serves both rules, because it returns the whole flag map. */
	async getEnabledRules(user: User): Promise<Required<NodeGroupRuleOptions>> {
		const flags = await this.postHogClient.getFeatureFlags(user);

		return {
			allowTriggerInGroup: flags?.[GROUPS_WITH_TRIGGERS_FLAG] === true,
			allowMultipleBoundaryNodes: flags?.[GROUPS_WITH_MANY_BOUNDARIES_FLAG] === true,
		};
	}
}
