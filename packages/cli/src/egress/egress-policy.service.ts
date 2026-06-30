import type { EgressPolicyStateResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { SsrfProtectionService } from '@n8n/backend-network';
import {
	InstanceSettingsLoaderConfig,
	SsrfProtectionConfig,
	SSRF_DEFAULT_BLOCKED_IP_RANGES,
	EGRESS_PROTECTION_MODES,
	type EgressProtectionMode,
} from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { Publisher } from '@/scaling/pubsub/publisher.service';

/** The single settings-table row that holds the egress protection policy. */
export const EGRESS_POLICY_KEY = 'egress.policy';

/** How often each instance independently reloads the policy as a backstop for a lost pubsub message. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** The built-in blocked IP ranges that are always enforced and can never be removed. */
const DEFAULT_BLOCKED_IP_RANGES: readonly string[] = SSRF_DEFAULT_BLOCKED_IP_RANGES;

/**
 * The egress protection policy stored as one JSON row in the settings table.
 *
 * `blockedIpRanges` holds only the admin's *additions* on top of
 * {@link DEFAULT_BLOCKED_IP_RANGES}; the built-in floor is always enforced and
 * is never stored here, so it cannot be edited away.
 */
interface EgressPolicy {
	mode: EgressProtectionMode;
	blockedIpRanges: string[];
	allowedIpRanges: string[];
	allowedHostnames: string[];
	blockedHostnames: string[];
	updatedAt?: string;
	updatedBy?: string;
}

/** The admin-editable subset of a policy (no audit fields). */
type EgressPolicyInput = Pick<
	EgressPolicy,
	'mode' | 'blockedIpRanges' | 'allowedIpRanges' | 'allowedHostnames' | 'blockedHostnames'
>;

/**
 * Owns the *effective* egress protection policy. The settings table is the
 * runtime source of truth:
 *
 * - The `N8N_EGRESS_*` env vars only *seed* the policy. On first boot (when no
 *   policy row exists) {@link EgressProtectionInstanceSettingsLoader} writes the
 *   env-derived policy into the settings table; when
 *   `N8N_EGRESS_PROTECTION_MANAGED_BY_ENV` is set it re-seeds on every startup
 *   and the UI is locked.
 * - Otherwise the policy row, edited via the admin UI, is authoritative.
 * - The {@link DEFAULT_BLOCKED_IP_RANGES} floor is always layered on top of the
 *   stored blocked ranges, so the built-in SSRF hardening can never be removed.
 *
 * The compiled policy is pushed into {@link SsrfProtectionService} so the
 * request path only ever reads an in-memory compiled copy — never the DB.
 * Changes propagate cluster-wide via the `egress-policy-changed` pubsub command
 * (fast path) plus a per-instance interval reload (backstop).
 */
@Service()
export class EgressPolicyService {
	private readonly logger: Logger;

	/** The env-seeded defaults, used as the fallback when no policy row exists yet. */
	private readonly envDefaults: EgressPolicyInput;

	private refreshTimer?: NodeJS.Timeout;

	private initialized = false;

	constructor(
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly settingsRepository: SettingsRepository,
		private readonly publisher: Publisher,
		logger: Logger,
	) {
		this.logger = logger.scoped('egress-protection');
		this.envDefaults = {
			mode: this.ssrfConfig.mode,
			// Stored blocked ranges are extras only; the built-in floor is applied separately.
			blockedIpRanges: withoutDefaults(this.ssrfConfig.blockedIpRanges),
			allowedIpRanges: [...this.ssrfConfig.allowedIpRanges],
			allowedHostnames: [...this.ssrfConfig.allowedHostnames],
			blockedHostnames: [...this.ssrfConfig.blockedHostnames],
		};
	}

	/** Whether the policy can be edited at runtime through the admin UI. */
	get editable(): boolean {
		return this.ssrfConfig.editable && !this.managedByEnv;
	}

	/** Whether env vars own the policy and re-seed it on every startup. */
	get managedByEnv(): boolean {
		return this.instanceSettingsLoaderConfig.egressProtectionManagedByEnv;
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
		// compiled the env seed, so we keep running on it and let the interval
		// backstop reconverge once the DB is reachable again.
		try {
			await this.reload();
		} catch (error) {
			this.logger.warn('Initial egress policy load failed; using environment seed', {
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

	/** Reload the policy from the DB, recompile it, and swap it into the engine. */
	async reload(): Promise<void> {
		this.applyEffective(await this.loadPolicy());
	}

	/** Reload when another instance reports a policy change. Idempotent; does not re-publish. */
	@OnPubSubEvent('egress-policy-changed')
	async handleEgressPolicyChanged(): Promise<void> {
		await this.reload();
	}

	/**
	 * Seed the policy row from the env vars. Called by the instance settings
	 * loader at startup. With `force` (managed-by-env) it overwrites the row on
	 * every boot; otherwise it only writes when no row exists yet, so existing
	 * deployments keep their configured policy and later UI edits are preserved.
	 */
	async seedFromEnv({ force }: { force: boolean }): Promise<'created' | 'skipped'> {
		if (!force && (await this.readPolicy()) !== null) return 'skipped';

		// No audit fields: this policy originates from env, not an admin edit.
		const policy: EgressPolicy = { ...this.envDefaults };
		await this.persist(policy);
		this.applyEffective(policy);
		return 'created';
	}

	/** The full state for the admin UI. */
	async getState(): Promise<EgressPolicyStateResponse> {
		const policy = await this.loadPolicy();

		return {
			mode: policy.mode,
			editable: this.editable,
			managedByEnv: this.managedByEnv,
			defaultBlockedIpRanges: [...DEFAULT_BLOCKED_IP_RANGES],
			blockedIpRanges: policy.blockedIpRanges,
			allowedIpRanges: policy.allowedIpRanges,
			allowedHostnames: policy.allowedHostnames,
			blockedHostnames: policy.blockedHostnames,
			updatedAt: policy.updatedAt,
		};
	}

	/**
	 * Persist a new policy, apply it locally, and broadcast the change so every
	 * instance reconverges. Rejects when editing is disabled.
	 */
	async updatePolicy(input: EgressPolicyInput, updatedBy?: string): Promise<void> {
		if (!this.editable) {
			throw new UserError('Egress protection policy is not editable on this instance');
		}

		const policy = this.sanitize(input, updatedBy);
		await this.persist(policy);

		// Apply synchronously on this instance, then tell the rest of the cluster.
		this.applyEffective(policy);

		void this.publisher.publishCommand({ command: 'egress-policy-changed' }).catch((error) => {
			this.logger.warn('Failed to publish egress-policy-changed', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/** Compile the policy (layering the built-in floor) and push it into the engine. */
	private applyEffective(policy: EgressPolicy): void {
		this.ssrfProtectionService.updatePolicy({
			mode: policy.mode,
			// The built-in floor is always enforced; stored extras only add to it.
			blockedIpRanges: union(DEFAULT_BLOCKED_IP_RANGES, policy.blockedIpRanges),
			allowedIpRanges: policy.allowedIpRanges,
			allowedHostnames: policy.allowedHostnames,
			blockedHostnames: policy.blockedHostnames,
		});

		this.logger.debug('Applied effective egress policy', { mode: policy.mode });
	}

	private async persist(policy: EgressPolicy): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: EGRESS_POLICY_KEY, value: JSON.stringify(policy), loadOnStartup: true },
			['key'],
		);
	}

	/** The stored policy, or the env seed defaults when no row exists yet. */
	private async loadPolicy(): Promise<EgressPolicy> {
		return (await this.readPolicy()) ?? { ...this.envDefaults };
	}

	/** Read and parse the policy row, or `null` when absent/unparseable. */
	private async readPolicy(): Promise<EgressPolicy | null> {
		const row = await this.settingsRepository.findByKey(EGRESS_POLICY_KEY);
		if (!row?.value) return null;

		try {
			const parsed: unknown = JSON.parse(row.value);
			if (typeof parsed !== 'object' || parsed === null) return null;
			const obj = parsed as Record<string, unknown>;
			return {
				mode: this.isValidMode(obj.mode) ? obj.mode : this.envDefaults.mode,
				blockedIpRanges: withoutDefaults(toStringArray(obj.blockedIpRanges)),
				allowedIpRanges: toStringArray(obj.allowedIpRanges),
				allowedHostnames: toStringArray(obj.allowedHostnames),
				blockedHostnames: toStringArray(obj.blockedHostnames),
				updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
				updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
			};
		} catch (error) {
			this.logger.warn('Failed to parse egress policy; falling back to environment seed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	private sanitize(input: EgressPolicyInput, updatedBy?: string): EgressPolicy {
		return {
			mode: this.isValidMode(input.mode) ? input.mode : this.envDefaults.mode,
			// Drop any built-in floor entries: they are always enforced, never stored.
			blockedIpRanges: withoutDefaults(dedupeTrimmed(input.blockedIpRanges)),
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

const DEFAULT_BLOCKED_SET = new Set(DEFAULT_BLOCKED_IP_RANGES);

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])];

/** Strip the built-in default blocked ranges so they are never duplicated or stored. */
const withoutDefaults = (ranges: readonly string[]): string[] =>
	ranges.filter((range) => !DEFAULT_BLOCKED_SET.has(range));

const toStringArray = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const dedupeTrimmed = (value: unknown): string[] => {
	const entries = toStringArray(value)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	return [...new Set(entries)];
};
