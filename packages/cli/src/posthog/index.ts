import {
	AGENT_EVALS_FLAG,
	CANVAS_NODE_CONTEXT_FLAG,
	CONFIG_EVALUATIONS_ENABLED_VARIANT,
	CONFIG_EVALUATIONS_FLAG,
	EVAL_COLLECTIONS_FLAG,
	INSTANCE_AI_MCP_CONNECTIONS_ENABLED_VARIANT,
	INSTANCE_AI_MCP_CONNECTIONS_FLAG,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { PublicUser } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Application } from 'express';
import { InstanceSettings } from 'n8n-core';
import type { FeatureFlags, ITelemetryTrackProperties } from 'n8n-workflow';
import type { PostHog, FeatureFlagEvaluations } from 'posthog-node';

import { N8N_VERSION } from '@/constants';

/**
 * PostHog group type for instance-level properties.
 * Note: Aliased as "instance" on PostHog dashboard
 */
const POSTHOG_GROUP_TYPE_INSTANCE = 'company';

const FLAGS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const SESSION_ID_MAX_LENGTH = 1000;

function sanitizeSessionId(value: string | undefined): string | undefined {
	const sanitized = value?.replace(/[^\x20-\x7E]/g, '').trim();
	return sanitized ? sanitized.slice(0, SESSION_ID_MAX_LENGTH) : undefined;
}

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
		// Catch PostHog errors here (rather than letting them propagate) so
		// env-var overrides still apply when PostHog is unreachable. Without
		// this, a transient PostHog outage would short-circuit the override
		// path and leave operators without an escape hatch.
		let flags: FeatureFlags = {};
		try {
			flags = await this.fetchFlagsFromPostHog(user);
		} catch {
			// fall through to env overrides
		}
		return this.applyEnvOverrides(flags);
	}

	private async fetchFlagsFromPostHog(
		user: Pick<PublicUser, 'id' | 'createdAt'>,
	): Promise<FeatureFlags> {
		if (!this.postHog) return {};

		const { instanceId } = this.instanceSettings;
		const fullId = [instanceId, user.id].join('#');

		const cached = this.flagsCache.get(fullId);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.flags;
		}

		const evaluatedFlags = await this.postHog.evaluateFlags(fullId, {
			personProperties: {
				created_at_timestamp: user.createdAt.getTime().toString(),
				instance_id: instanceId,
				version_cli: N8N_VERSION,
			},
			...(instanceId && { groups: { [POSTHOG_GROUP_TYPE_INSTANCE]: instanceId } }),
		});
		const flags = this.resolveFeatureFlagVariants(evaluatedFlags);

		if (Object.keys(flags).length > 0) {
			this.flagsCache.set(fullId, { flags, expiresAt: Date.now() + FLAGS_CACHE_TTL_MS });
		}

		return flags;
	}

	private resolveFeatureFlagVariants(evaluatedFlags: FeatureFlagEvaluations): FeatureFlags {
		const result: FeatureFlags = {};

		if (!evaluatedFlags || !Array.isArray(evaluatedFlags.keys)) return result;

		for (const key of evaluatedFlags.keys) {
			try {
				result[key] = evaluatedFlags.getFlag(key);
			} catch {}
		}

		return result;
	}

	/**
	 * Applies env-var overrides on top of PostHog-resolved flags. Cached PostHog
	 * data is stored without overrides so changing an env var (across restarts)
	 * doesn't poison the cache.
	 *
	 * Both tiers win over PostHog. Between themselves, the generic map goes
	 * first so a dedicated per-feature env var always has the final say:
	 * 1. The generic map (`N8N_FEATURE_FLAG_OVERRIDES`) — sets a flag to any
	 *    value, so unlike tier 2 it can force a flag *off* as well as on.
	 * 2. Per-feature booleans (`N8N_CONFIG_EVALS_ENABLED`, …) — force-enable
	 *    only; `false` defers to PostHog. Applied last so the generic map
	 *    cannot undo a feature an operator enabled explicitly.
	 */
	private applyEnvOverrides(flags: FeatureFlags): FeatureFlags {
		const overrides: FeatureFlags = { ...this.globalConfig.featureFlags.override };

		if (this.globalConfig.evaluation.collectionsEnabled) {
			overrides[EVAL_COLLECTIONS_FLAG] = true;
		}

		// `088_config_evaluations` is multivariate — the enabled arm is the
		// `variant` string, not a boolean (`isConfigEvalsEnabled` checks for it).
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

		return Object.keys(overrides).length === 0 ? flags : { ...flags, ...overrides };
	}
}
