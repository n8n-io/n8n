import {
	AGENT_EVALS_FLAG,
	CANVAS_NODE_CONTEXT_FLAG,
	INSTANCE_AI_NODE_USAGE_FLAG,
	CONFIG_EVALUATIONS_ENABLED_VARIANT,
	CONFIG_EVALUATIONS_FLAG,
	EVAL_COLLECTIONS_FLAG,
	INSTANCE_AI_FOLDER_EXPLORATION_ENABLED_VARIANT,
	INSTANCE_AI_FOLDER_EXPLORATION_FLAG,
	INSTANCE_ACTIVITY_CONTEXT_FLAG,
	INSTANCE_AI_MCP_CONNECTIONS_ENABLED_VARIANT,
	INSTANCE_AI_MCP_CONNECTIONS_FLAG,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { PublicUser } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Application } from 'express';
import { InstanceSettings } from 'n8n-core';
import type { FeatureFlagPayloads, FeatureFlags, ITelemetryTrackProperties } from 'n8n-workflow';
import type { AllFlagsOptions, FeatureFlagEvaluations, PostHog } from 'posthog-node';

import { N8N_VERSION } from '@/constants';

/**
 * PostHog group type for instance-level properties.
 * Note: Aliased as "instance" on PostHog dashboard
 */
const POSTHOG_GROUP_TYPE_INSTANCE = 'company';

const FLAGS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Empty results expire quickly but still prevent retries for each event. */
const EMPTY_FLAGS_CACHE_TTL_MS = 30 * 1000; // 30 seconds

/** Maximum number of flag evaluations kept in memory. */
export const FLAGS_CACHE_MAX_ENTRIES = 5_000;

const SESSION_ID_MAX_LENGTH = 1000;

function sanitizeSessionId(value: string | undefined): string | undefined {
	const sanitized = value?.replace(/[^\x20-\x7E]/g, '').trim();
	return sanitized ? sanitized.slice(0, SESSION_ID_MAX_LENGTH) : undefined;
}

interface FeatureFlagData {
	featureFlags: FeatureFlags;
	featureFlagPayloads: FeatureFlagPayloads;
}

interface CachedFlags extends FeatureFlagData {
	expiresAt: number;
}

@Service()
export class PostHogClient {
	private postHog?: PostHog;

	private readonly flagsCache = new Map<string, CachedFlags>();

	/** Active evaluations. Callers with the same cache key share one request. */
	private readonly inFlightEvaluations = new Map<string, Promise<FeatureFlagData>>();

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

	setupExpressSessionContext(app: Application): void {
		const postHog = this.postHog;
		if (!postHog || this.globalConfig.deployment.type !== 'cloud') return;

		app.use((req, _res, next) => {
			const sessionId = sanitizeSessionId(req.get('x-posthog-session-id'));
			if (!sessionId) return next();

			postHog.withContext({ sessionId }, next);
		});
	}

	async stop(): Promise<void> {
		if (this.postHog) {
			return await this.postHog.shutdown();
		}
	}

	track(payload: { userId: string; event: string; properties: ITelemetryTrackProperties }): void {
		if (!payload.userId || payload.userId === this.instanceSettings.instanceId) return;

		const instanceId = payload?.properties?.instance_id;

		this.postHog?.capture({
			event: payload.event,
			distinctId: payload.userId,
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
			distinctId: distinctId ?? `${POSTHOG_GROUP_TYPE_INSTANCE}_${instanceId}`,
			event: '$groupidentify',
			properties: {
				$group_type: POSTHOG_GROUP_TYPE_INSTANCE,
				$group_key: instanceId,
				$group_set: properties,
				...(!distinctId && { $process_person_profile: false }),
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
		return (await this.getFeatureFlagsAndPayloads(user)).featureFlags;
	}

	async getFeatureFlagForInstance(flagName: string): Promise<FeatureFlags[string]> {
		const { instanceId } = this.instanceSettings;
		let data: FeatureFlagData = { featureFlags: {}, featureFlagPayloads: {} };

		try {
			data = await this.fetchFlagsFromPostHog({
				cacheKey: ['instance', instanceId, flagName].join('#'),
				distinctId: `${POSTHOG_GROUP_TYPE_INSTANCE}_${instanceId}`,
				options: {
					flagKeys: [flagName],
					groups: { [POSTHOG_GROUP_TYPE_INSTANCE]: instanceId },
				},
			});
		} catch {
			// Apply local overrides when PostHog is not available.
		}

		return this.applyEnvOverrides(data).featureFlags[flagName];
	}

	async getFeatureFlagsAndPayloads(
		user: Pick<PublicUser, 'id' | 'createdAt'>,
	): Promise<FeatureFlagData> {
		// Apply local overrides when PostHog is not available.
		let data: FeatureFlagData = { featureFlags: {}, featureFlagPayloads: {} };
		try {
			const { instanceId } = this.instanceSettings;
			const distinctId = [instanceId, user.id].join('#');
			data = await this.fetchFlagsFromPostHog({
				cacheKey: [distinctId, user.createdAt.getTime()].join('#'),
				distinctId,
				options: {
					personProperties: {
						created_at_timestamp: user.createdAt.getTime().toString(),
						instance_id: instanceId,
						version_cli: N8N_VERSION,
					},
					...(instanceId && { groups: { [POSTHOG_GROUP_TYPE_INSTANCE]: instanceId } }),
				},
			});
		} catch {
			// Apply local overrides when PostHog is not available.
		}
		return this.applyEnvOverrides(data);
	}

	private async fetchFlagsFromPostHog({
		cacheKey,
		distinctId,
		options,
	}: {
		cacheKey: string;
		distinctId: string;
		options: AllFlagsOptions;
	}): Promise<FeatureFlagData> {
		if (!this.postHog) return { featureFlags: {}, featureFlagPayloads: {} };

		const cached = this.flagsCache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) {
			return cached;
		}

		// Share an active request so a later failure cannot replace a successful result.
		const inFlight = this.inFlightEvaluations.get(cacheKey);
		if (inFlight) return await inFlight;

		const evaluation = this.evaluateAndRemember(
			this.postHog,
			cacheKey,
			distinctId,
			options,
		).finally(() => this.inFlightEvaluations.delete(cacheKey));
		this.inFlightEvaluations.set(cacheKey, evaluation);
		return await evaluation;
	}

	private async evaluateAndRemember(
		postHog: PostHog,
		cacheKey: string,
		distinctId: string,
		options: AllFlagsOptions,
	): Promise<FeatureFlagData> {
		// Cache failures briefly so event bursts do not retry each event.
		let data: FeatureFlagData;
		try {
			const evaluatedFlags = await postHog.evaluateFlags(distinctId, options);
			data = this.resolveFeatureFlagData(evaluatedFlags);
		} catch {
			data = { featureFlags: {}, featureFlagPayloads: {} };
		}

		// Cache empty results briefly because they can indicate a temporary failure.
		const ttl =
			Object.keys(data.featureFlags).length > 0 ? FLAGS_CACHE_TTL_MS : EMPTY_FLAGS_CACHE_TTL_MS;
		this.rememberFlags(cacheKey, { ...data, expiresAt: Date.now() + ttl });

		return data;
	}

	/** Stores a slot, dropping the oldest insertion once the cache is full. */
	private rememberFlags(cacheKey: string, entry: CachedFlags): void {
		if (!this.flagsCache.has(cacheKey) && this.flagsCache.size >= FLAGS_CACHE_MAX_ENTRIES) {
			const oldest = this.flagsCache.keys().next();
			if (!oldest.done) this.flagsCache.delete(oldest.value);
		}
		this.flagsCache.set(cacheKey, entry);
	}

	private resolveFeatureFlagData(evaluatedFlags: FeatureFlagEvaluations): FeatureFlagData {
		const featureFlags: FeatureFlags = {};
		const featureFlagPayloads: FeatureFlagPayloads = {};

		if (!evaluatedFlags || !Array.isArray(evaluatedFlags.keys)) {
			return { featureFlags, featureFlagPayloads };
		}

		for (const key of evaluatedFlags.keys) {
			try {
				featureFlags[key] = evaluatedFlags.getFlag(key);
				const payload = evaluatedFlags.getFlagPayload(key);
				if (payload !== undefined && payload !== null) {
					featureFlagPayloads[key] = payload;
				}
			} catch {}
		}

		return { featureFlags, featureFlagPayloads };
	}

	/** Applies local settings after PostHog. The generic activity override can disable its setting. */
	private applyEnvOverrides(data: FeatureFlagData): FeatureFlagData {
		const overrides = { ...this.globalConfig.featureFlags.override };

		if (this.globalConfig.evaluation.collectionsEnabled) {
			overrides[EVAL_COLLECTIONS_FLAG] = true;
		}

		// `088_config_evaluations` is multivariate — the enabled arm is the
		// `variant` string, not a boolean (`resolveExperimentGates` checks for it).
		if (this.globalConfig.evaluation.configEvalsEnabled) {
			overrides[CONFIG_EVALUATIONS_FLAG] = CONFIG_EVALUATIONS_ENABLED_VARIANT;
		}

		if (this.globalConfig.evaluation.agentEvalsEnabled) {
			overrides[AGENT_EVALS_FLAG] = true;
		}

		if (this.globalConfig.instanceAi.mcpConnectionsEnabled) {
			overrides[INSTANCE_AI_MCP_CONNECTIONS_FLAG] = INSTANCE_AI_MCP_CONNECTIONS_ENABLED_VARIANT;
		}

		if (this.globalConfig.instanceAi.canvasNodeContextEnabled) {
			overrides[CANVAS_NODE_CONTEXT_FLAG] = true;
		}

		if (this.globalConfig.instanceAi.nodeUsageEnabled) {
			overrides[INSTANCE_AI_NODE_USAGE_FLAG] = true;
		}

		if (this.globalConfig.instanceAi.folderExplorationEnabled) {
			overrides[INSTANCE_AI_FOLDER_EXPLORATION_FLAG] =
				INSTANCE_AI_FOLDER_EXPLORATION_ENABLED_VARIANT;
		}

		// An explicit feature flag override takes priority over this legacy setting.
		if (this.globalConfig.activityLog.enabled && !(INSTANCE_ACTIVITY_CONTEXT_FLAG in overrides)) {
			overrides[INSTANCE_ACTIVITY_CONTEXT_FLAG] = true;
		}

		if (Object.keys(overrides).length === 0) {
			return {
				featureFlags: data.featureFlags,
				featureFlagPayloads: data.featureFlagPayloads,
			};
		}

		const featureFlags = { ...data.featureFlags };
		const featureFlagPayloads = { ...data.featureFlagPayloads };

		for (const [key, override] of Object.entries(overrides)) {
			const value = typeof override === 'object' ? override.value : override;
			const payload = typeof override === 'object' ? override.payload : undefined;

			featureFlags[key] = value;
			if (payload === undefined || payload === null) {
				delete featureFlagPayloads[key];
			} else {
				featureFlagPayloads[key] = payload;
			}
		}

		return { featureFlags, featureFlagPayloads };
	}
}
