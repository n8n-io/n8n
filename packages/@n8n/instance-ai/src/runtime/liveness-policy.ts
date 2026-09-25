export type InstanceAiLivenessSurface =
	| 'active-run'
	| 'suspended-run'
	| 'pending-confirmation'
	| 'background-task';

export type InstanceAiLivenessTimeoutReason = 'idle_timeout' | 'max_lifetime';

export interface InstanceAiLivenessPolicyConfig {
	confirmationTimeoutMs: number;
	backgroundTaskIdleTimeoutMs: number;
	backgroundTaskMaxLifetimeMs: number;
	activeRunIdleTimeoutMs: number;
	activeRunMaxLifetimeMs: number;
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG = {
	confirmationTimeoutMs: DAY_MS,
	backgroundTaskIdleTimeoutMs: 10 * MINUTE_MS,
	backgroundTaskMaxLifetimeMs: 30 * MINUTE_MS,
	// Left disabled on purpose. An orchestrator awaiting a long sub-agent can be
	// legitimately quiet for a while, and whether `touchRun` fires across every such
	// stretch is unverified -- enabling this would risk reaping live runs.
	activeRunIdleTimeoutMs: 0,
	// Matches `confirmationTimeoutMs` on purpose, and must not simply be lowered.
	// `startedAt` survives suspend/resume (see `suspendRun` / `activateSuspendedRun`), so
	// this bounds wall-clock since the run first began -- including time parked waiting on
	// a human -- not execution time. Lowering it to, say, 2h would reap a run whose user
	// approved a confirmation card three hours later, right as it resumed.
	//
	// Once `N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS` is enabled a day is too long to hold a
	// slot, because a wedged run then costs a share of instance capacity rather than just
	// its own thread. The fix at that point is to measure from the last activation rather
	// than the original start, not to shrink this number.
	activeRunMaxLifetimeMs: DAY_MS,
} satisfies InstanceAiLivenessPolicyConfig;

export function createInstanceAiLivenessPolicyConfig(
	overrides: Partial<Pick<InstanceAiLivenessPolicyConfig, 'confirmationTimeoutMs'>> = {},
): InstanceAiLivenessPolicyConfig {
	return {
		...INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
		...overrides,
	};
}

export interface InstanceAiLivenessInput {
	surface: InstanceAiLivenessSurface;
	startedAt: number;
	lastActivityAt: number;
	now?: number;
}

export type InstanceAiLivenessDecision =
	| { action: 'keep-alive' }
	| {
			action: 'timeout';
			reason: InstanceAiLivenessTimeoutReason;
			surface: InstanceAiLivenessSurface;
			timeoutMs: number;
			elapsedMs: number;
			idleMs: number;
	  };

export class InstanceAiLivenessPolicy {
	constructor(private readonly config: InstanceAiLivenessPolicyConfig) {}

	hasEnabledTimeouts(): boolean {
		return Object.values(this.config).some((value) => value > 0);
	}

	evaluate(input: InstanceAiLivenessInput): InstanceAiLivenessDecision {
		const now = input.now ?? Date.now();
		const elapsedMs = Math.max(0, now - input.startedAt);
		const idleMs = Math.max(0, now - input.lastActivityAt);
		const limits = this.getLimits(input.surface);

		if (limits.idleTimeoutMs > 0 && idleMs >= limits.idleTimeoutMs) {
			return {
				action: 'timeout',
				reason: 'idle_timeout',
				surface: input.surface,
				timeoutMs: limits.idleTimeoutMs,
				elapsedMs,
				idleMs,
			};
		}

		if (limits.maxLifetimeMs > 0 && elapsedMs >= limits.maxLifetimeMs) {
			return {
				action: 'timeout',
				reason: 'max_lifetime',
				surface: input.surface,
				timeoutMs: limits.maxLifetimeMs,
				elapsedMs,
				idleMs,
			};
		}

		return { action: 'keep-alive' };
	}

	private getLimits(surface: InstanceAiLivenessSurface): {
		idleTimeoutMs: number;
		maxLifetimeMs: number;
	} {
		if (surface === 'background-task') {
			return {
				idleTimeoutMs: this.config.backgroundTaskIdleTimeoutMs,
				maxLifetimeMs: this.config.backgroundTaskMaxLifetimeMs,
			};
		}

		if (surface === 'active-run') {
			return {
				idleTimeoutMs: this.config.activeRunIdleTimeoutMs,
				maxLifetimeMs: this.config.activeRunMaxLifetimeMs,
			};
		}

		return {
			idleTimeoutMs: this.config.confirmationTimeoutMs,
			maxLifetimeMs: 0,
		};
	}
}
