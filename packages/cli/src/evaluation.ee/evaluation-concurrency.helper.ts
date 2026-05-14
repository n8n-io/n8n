import type { ExecutionsConfig } from '@n8n/config';

import type { License } from '@/license';

/**
 * Tier defaults applied when `N8N_CONCURRENCY_EVALUATION_LIMIT` is not set in
 * the environment. Self-hosted operators retain control by setting the env
 * var — it wins over the tier default regardless of license plan.
 */
export const EVALUATION_TIER_DEFAULTS = {
	Community: 1,
	Pro: 1,
	Business: 3,
	Enterprise: 5,
} as const;

const EVALUATION_CONCURRENCY_ENV_VAR = 'N8N_CONCURRENCY_EVALUATION_LIMIT';

/** Telemetry tag — distinguishes self-host operator overrides from tier defaults. */
export type EvaluationConcurrencyLimitSource = 'env' | 'tier';

export function getEvaluationConcurrencyLimitSource(): EvaluationConcurrencyLimitSource {
	return process.env[EVALUATION_CONCURRENCY_ENV_VAR] !== undefined ? 'env' : 'tier';
}

const isPlanTier = (name: string): name is keyof typeof EVALUATION_TIER_DEFAULTS =>
	name in EVALUATION_TIER_DEFAULTS;

/**
 * Resolve the effective evaluation concurrency limit for this instance.
 *
 * Order of precedence:
 * 1. `N8N_CONCURRENCY_EVALUATION_LIMIT` env var (-1 = unlimited, n ≥ 1 = cap)
 * 2. License-tier default (Community/Pro = 1, Business = 3, Enterprise = 5)
 *
 * Unknown plan names fall back to the sequential default (1) — safer to be
 * conservative than to grant parallelism to an unmapped tier.
 *
 * We detect "env was explicitly set" by inspecting `process.env` directly
 * rather than by sentinel value on the parsed config, because the parsed
 * `evaluationLimit` reuses `-1` as a meaningful "unlimited" value — there is
 * no spare sentinel inside the integer domain.
 */
export function resolveEvaluationConcurrencyLimit(
	executionsConfig: ExecutionsConfig,
	license: License,
): number {
	if (process.env[EVALUATION_CONCURRENCY_ENV_VAR] !== undefined) {
		return executionsConfig.concurrency.evaluationLimit;
	}

	const planName = license.getPlanName();
	return isPlanTier(planName) ? EVALUATION_TIER_DEFAULTS[planName] : 1;
}
