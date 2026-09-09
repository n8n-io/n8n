import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

/**
 * Per-user rollout gate for the canvas-node chat-context feature.
 *
 * PostHog owns cohort rollout; `N8N_INSTANCE_AI_NODE_CONTEXT_ENABLED` still
 * force-enables because {@link PostHogClient} layers that override on top of
 * the resolved flags. Fails closed on any PostHog error so an outage never
 * turns the feature on by accident.
 */
@Service()
export class CanvasNodeContextFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		try {
			const flags = await this.postHogClient.getFeatureFlags(user);
			return flags?.[CANVAS_NODE_CONTEXT_FLAG] === true;
		} catch {
			return false;
		}
	}
}
