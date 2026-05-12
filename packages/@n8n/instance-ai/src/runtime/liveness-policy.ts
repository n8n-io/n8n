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

export const INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG = {
	confirmationTimeoutMs: 10 * MINUTE_MS,
	backgroundTaskIdleTimeoutMs: 10 * MINUTE_MS,
	backgroundTaskMaxLifetimeMs: 30 * MINUTE_MS,
	activeRunIdleTimeoutMs: 10 * MINUTE_MS,
	activeRunMaxLifetimeMs: 30 * MINUTE_MS,
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
