import type { EgressPolicyStateResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { SsrfProtectionService } from '@n8n/backend-network';
import {
	SsrfProtectionConfig,
	EGRESS_PROTECTION_MODES,
	type EgressProtectionMode,
} from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { Publisher } from '@/scaling/pubsub/publisher.service';

export const EGRESS_POLICY_OVERRIDE_KEY = 'egress.policyOverride';

/** How often each instance independently reloads the policy as a backstop for a lost pubsub message. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** The runtime override an admin can edit, stored as one JSON row in the settings table. */
interface EgressPolicyOverride {
	/** If set, replaces the baseline mode. */
	mode?: EgressProtectionMode;
	blockedIpRanges: string[];
	allowedIpRanges: string[];
	allowedHostnames: string[];
	blockedHostnames: string[];
	updatedAt?: string;
	updatedBy?: string;
}

/** The admin-editable subset of an override (no audit fields). */
type EgressPolicyOverrideInput = Pick<
	EgressPolicyOverride,
	'mode' | 'blockedIpRanges' | 'allowedIpRanges' | 'allowedHostnames' | 'blockedHostnames'
>;

const EMPTY_OVERRIDE: EgressPolicyOverride = {
	blockedIpRanges: [],
	allowedIpRanges: [],
	allowedHostnames: [],
	blockedHostnames: [],
};

/**
 * Owns the *effective* egress protection policy: `baseline (env) ⊕ override (DB)`.
 *
 * - The environment baseline (from {@link SsrfProtectionConfig}) is snapshotted
 *   once at construction; it is always valid on its own and is the fallback when
 *   the DB is unavailable.
 * - The admin's override lives in the settings table and is layered on top.
 * - The composed policy is pushed into {@link SsrfProtectionService} so the
 *   request path only ever reads an in-memory compiled copy — never the DB.
 *
 * Changes propagate cluster-wide via the `egress-policy-changed` pubsub command
 * (fast path) plus a per-instance interval reload (backstop), mirroring the
 * `redaction-floor-changed` precedent. When editing is disabled
 * (`N8N_EGRESS_PROTECTION_EDITABLE=false`, e.g. Cloud), the override layer is
 * ignored entirely and the baseline is the whole policy.
 */
@Service()
export class EgressPolicyService {
	private readonly logger: Logger;

	/** Immutable snapshot of the environment baseline, captured before any override is applied. */
	private readonly baseline: {
		mode: EgressProtectionMode;
		blockedIpRanges: string[];
		allowedIpRanges: string[];
		allowedHostnames: string[];
		blockedHostnames: string[];
	};

	private refreshTimer?: NodeJS.Timeout;

	private initialized = false;

	constructor(
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly settingsRepository: SettingsRepository,
		private readonly publisher: Publisher,
		logger: Logger,
	) {
		this.logger = logger.scoped('egress-protection');
		this.baseline = {
			mode: this.ssrfConfig.mode,
			blockedIpRanges: [...this.ssrfConfig.blockedIpRanges],
			allowedIpRanges: [...this.ssrfConfig.allowedIpRanges],
			allowedHostnames: [...this.ssrfConfig.allowedHostnames],
			blockedHostnames: [...this.ssrfConfig.blockedHostnames],
		};
	}

	/** Whether the policy can be edited at runtime. */
	get editable(): boolean {
		return this.ssrfConfig.editable;
	}

	/**
	 * Apply the policy from the DB and start the interval backstop. Called once
	 * per instance at startup (main, worker, webhook).
	 */
	async init(): Promise<void> {
		// Idempotent: a second call must not schedule a second backstop timer.
		if (this.initialized) return;
		this.initialized = true;

		// A DB hiccup at startup must not abort the instance. The constructor already
		// compiled the env baseline, so we keep running on it and let the interval
		// backstop reconverge once the DB is reachable again.
		try {
			await this.reload();
		} catch (error) {
			this.logger.warn('Initial egress policy load failed; using environment baseline', {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		this.refreshTimer = setInterval(() => {
			void this.reload().catch((error) => {
				this.logger.warn('Egress policy interval reload failed', {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, REFRESH_INTERVAL_MS);
		// Don't keep the event loop alive solely for the backstop timer.
		this.refreshTimer.unref?.();
	}

	@OnShutdown()
	shutdown(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = undefined;
		}
	}

	/** Reload the override from the DB, recompile the effective policy, and swap it into the engine. */
	async reload(): Promise<void> {
		const override = await this.loadOverride();
		this.applyEffective(override);
	}

	/** Reload when another instance reports a policy change. Idempotent; does not re-publish. */
	@OnPubSubEvent('egress-policy-changed')
	async handleEgressPolicyChanged(): Promise<void> {
		await this.reload();
	}

	/** The full state for the admin UI (effective + baseline + override, split per list). */
	async getState(): Promise<EgressPolicyStateResponse> {
		const override = await this.loadOverride();
		const effectiveOverride = this.editable ? override : EMPTY_OVERRIDE;

		return {
			mode: effectiveOverride.mode ?? this.baseline.mode,
			baselineMode: this.baseline.mode,
			editable: this.editable,
			blockedIpRanges: {
				baseline: this.baseline.blockedIpRanges,
				override: effectiveOverride.blockedIpRanges,
			},
			allowedIpRanges: {
				baseline: this.baseline.allowedIpRanges,
				override: effectiveOverride.allowedIpRanges,
			},
			allowedHostnames: {
				baseline: this.baseline.allowedHostnames,
				override: effectiveOverride.allowedHostnames,
			},
			blockedHostnames: {
				baseline: this.baseline.blockedHostnames,
				override: effectiveOverride.blockedHostnames,
			},
			updatedAt: override.updatedAt,
		};
	}

	/**
	 * Persist a new override, apply it locally, and broadcast the change so every
	 * instance reconverges. Rejects when editing is disabled.
	 */
	async updateOverride(input: EgressPolicyOverrideInput, updatedBy?: string): Promise<void> {
		if (!this.editable) {
			throw new UserError('Egress protection policy is not editable on this instance');
		}

		const override = this.sanitizeOverride(input, updatedBy);
		const serialized = JSON.stringify(override);

		await this.settingsRepository.upsert(
			{ key: EGRESS_POLICY_OVERRIDE_KEY, value: serialized, loadOnStartup: true },
			['key'],
		);

		// Apply synchronously on this instance, then tell the rest of the cluster.
		this.applyEffective(override);

		void this.publisher.publishCommand({ command: 'egress-policy-changed' }).catch((error) => {
			this.logger.warn('Failed to publish egress-policy-changed', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/** Compose baseline ⊕ override and push the result into the engine. */
	private applyEffective(override: EgressPolicyOverride): void {
		const effectiveOverride = this.editable ? override : EMPTY_OVERRIDE;
		const mode = effectiveOverride.mode ?? this.baseline.mode;

		this.ssrfProtectionService.updatePolicy({
			mode,
			// Lists merge as a union: the override is additive and can never remove a
			// baseline entry, so the `default` blocklist set stays sticky by construction.
			blockedIpRanges: union(this.baseline.blockedIpRanges, effectiveOverride.blockedIpRanges),
			allowedIpRanges: union(this.baseline.allowedIpRanges, effectiveOverride.allowedIpRanges),
			allowedHostnames: union(this.baseline.allowedHostnames, effectiveOverride.allowedHostnames),
			blockedHostnames: union(this.baseline.blockedHostnames, effectiveOverride.blockedHostnames),
		});

		this.logger.debug('Applied effective egress policy', { mode });
	}

	private async loadOverride(): Promise<EgressPolicyOverride> {
		const row = await this.settingsRepository.findByKey(EGRESS_POLICY_OVERRIDE_KEY);
		if (!row?.value) return { ...EMPTY_OVERRIDE };

		try {
			const parsed: unknown = JSON.parse(row.value);
			if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY_OVERRIDE };
			const obj = parsed as Record<string, unknown>;
			return {
				mode: this.isValidMode(obj.mode) ? obj.mode : undefined,
				blockedIpRanges: toStringArray(obj.blockedIpRanges),
				allowedIpRanges: toStringArray(obj.allowedIpRanges),
				allowedHostnames: toStringArray(obj.allowedHostnames),
				blockedHostnames: toStringArray(obj.blockedHostnames),
				updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
				updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
			};
		} catch (error) {
			this.logger.warn('Failed to parse egress policy override; falling back to baseline', {
				error: error instanceof Error ? error.message : String(error),
			});
			return { ...EMPTY_OVERRIDE };
		}
	}

	private sanitizeOverride(
		input: EgressPolicyOverrideInput,
		updatedBy?: string,
	): EgressPolicyOverride {
		return {
			mode: this.isValidMode(input.mode) ? input.mode : undefined,
			blockedIpRanges: dedupeTrimmed(input.blockedIpRanges),
			allowedIpRanges: dedupeTrimmed(input.allowedIpRanges),
			allowedHostnames: dedupeTrimmed(input.allowedHostnames),
			blockedHostnames: dedupeTrimmed(input.blockedHostnames),
			updatedAt: new Date().toISOString(),
			updatedBy,
		};
	}

	private isValidMode(mode: unknown): mode is EgressProtectionMode {
		return (
			typeof mode === 'string' && (EGRESS_PROTECTION_MODES as readonly string[]).includes(mode)
		);
	}
}

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])];

const toStringArray = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const dedupeTrimmed = (value: unknown): string[] => {
	const entries = toStringArray(value)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	return [...new Set(entries)];
};
