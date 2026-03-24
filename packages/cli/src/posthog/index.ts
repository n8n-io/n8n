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

const FLAGS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedFlags {
	flags: FeatureFlags;
	expiresAt: number;
}

@Service()
export class PostHogClient {
	private postHog?: PostHog;

	private readonly flagsCache = new Map<string, CachedFlags>();

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
		const instanceId = payload?.properties?.instance_id;

		this.postHog?.capture({
			event: payload.event,
			distinctId: payload.userId,
			sendFeatureFlags: true,
			properties: payload.properties,
			...(typeof instanceId === 'string' && {
				groups: { [POSTHOG_GROUP_TYPE_INSTANCE]: instanceId },
			}),
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

		this.postHog?.capture({
			distinctId: distinctId || instanceId,
			event: '$groupidentify',
			sendFeatureFlags: true,
			properties: {
				$group_type: POSTHOG_GROUP_TYPE_INSTANCE,
				$group_key: instanceId,
				$group_set: properties,
			},
			groups: {
				[POSTHOG_GROUP_TYPE_INSTANCE]: instanceId,
			},
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

		const { instanceId } = this.instanceSettings;
		const fullId = [instanceId, user.id].join('#');

		const cached = this.flagsCache.get(fullId);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.flags;
		}

		// cannot use local evaluation because that requires PostHog personal api key with org-wide
		// https://github.com/PostHog/posthog/issues/4849
		const flags = await this.postHog.getAllFlags(fullId, {
			personProperties: {
				created_at_timestamp: user.createdAt.getTime().toString(),
			},
			...(instanceId && { groups: { [POSTHOG_GROUP_TYPE_INSTANCE]: instanceId } }),
		});

		if (flags && Object.keys(flags).length > 0) {
			this.flagsCache.set(fullId, { flags, expiresAt: Date.now() + FLAGS_CACHE_TTL_MS });
		}

		return flags ?? {};
	}
}
