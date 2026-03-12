import { GlobalConfig } from '@n8n/config';
import type { PublicUser } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { FeatureFlags, ITelemetryTrackProperties } from 'n8n-workflow';
import type { PostHog } from 'posthog-node';

/**
 * PostHog group type for instance-level properties.
 * Note: Aliased as "instance" on PostHog dashboard
 */
const POSTHOG_GROUP_TYPE_INSTANCE = 'company';

@Service()
export class PostHogClient {
	private postHog?: PostHog;

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {}

	async init() {
		const { enabled, posthogConfig } = this.globalConfig.diagnostics;
		if (!enabled) {
			return;
		}

		const { PostHog } = await import('posthog-node');
		this.postHog = new PostHog(posthogConfig.apiKey, {
			host: posthogConfig.apiHost,
		});
	}

	async stop(): Promise<void> {
		if (this.postHog) {
			return this.postHog.shutdown();
		}
	}

	track(payload: { userId: string; event: string; properties: ITelemetryTrackProperties }): void {
		this.postHog?.capture({
			distinctId: payload.userId,
			sendFeatureFlags: true,
			...payload,
		});
	}

	groupIdentify({
		instanceId,
		distinctId,
		properties,
	}: {
		instanceId: string;
		distinctId?: string;
		properties: Record<string, string | number> | undefined;
	}): void {
		if (!instanceId) return;

		this.postHog?.groupIdentify({
			groupType: POSTHOG_GROUP_TYPE_INSTANCE,
			groupKey: instanceId,
			properties,
			...(distinctId && { distinctId }),
		});
	}

	identify({
		distinctId,
		properties,
	}: { distinctId: string; properties: Record<string | number, unknown> | undefined }): void {
		if (!distinctId) return;

		this.postHog?.identify({
			distinctId,
			properties: properties ?? undefined,
		});
	}

	async getFeatureFlags(user: Pick<PublicUser, 'id' | 'createdAt'>): Promise<FeatureFlags> {
		if (!this.postHog) return {};

		const fullId = [this.instanceSettings.instanceId, user.id].join('#');

		// cannot use local evaluation because that requires PostHog personal api key with org-wide
		// https://github.com/PostHog/posthog/issues/4849
		return await this.postHog.getAllFlags(fullId, {
			personProperties: {
				created_at_timestamp: user.createdAt.getTime().toString(),
			},
		});
	}
}
