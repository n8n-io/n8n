import type { ExecutionsConfig } from '@n8n/config';

import type { License } from '@/license';

/**
 * Tier defaults applied when neither the env override nor the license quota
 * are set. The license server (via `quota:evaluations:concurrencyLimit`)
 * can override these per-customer without a code release; self-hosted
 * operators retain final control via `N8N_CONCURRENCY_EVALUATION_LIMIT`.
 */
export const EVALUATION_TIER_DEFAULTS = {
	Community: 1,
	Pro: 1,
	Business: 3,
	Enterprise: 5,
} as const;

const EVALUATION_CONCURRENCY_ENV_VAR = 'N8N_CONCURRENCY_EVALUATION_LIMIT';
const EVALUATION_CONCURRENCY_QUOTA = 'quota:evaluations:concurrencyLimit';

/**
 * Telemetry tag — records which precedence branch supplied the effective
 * limit on this run. Lets us measure adoption of the license-quota path as
 * the license-management service starts issuing the key per customer.
 */
export type EvaluationConcurrencyLimitSource = 'env' | 'license' | 'tier';

const isPlanTier = (name: string): name is keyof typeof EVALUATION_TIER_DEFAULTS =>
	name in EVALUATION_TIER_DEFAULTS;

/**
 * `true` when the license carries an explicit `quota:evaluations:concurrencyLimit`
 * entitlement. `undefined` means "no opinion, fall through". `-1` and any
 * positive integer count as "explicit" so the license can express both
 * "unlimited" and a numeric cap.
 *
 * Anything else (e.g. `0`) is rejected — the resolver treats it as absent
 * because `0` cannot be honoured (a zero-capacity queue is meaningless).
 */
function readLicenseQuota(license: License): number | undefined {
	const raw = license.getValue(EVALUATION_CONCURRENCY_QUOTA);
	if (typeof raw !== 'number') return undefined;
	if (raw === 0) return undefined;
	return raw;
}

/**
 * Resolve the effective evaluation concurrency limit for this instance.
 *
 * Order of precedence:
 * 1. `N8N_CONCURRENCY_EVALUATION_LIMIT` env var (operator escape hatch)
 * 2. `quota:evaluations:concurrencyLimit` license entitlement (per-customer
 *    override issued by the license-management service)
 * 3. License-tier default (Community/Pro = 1, Business = 3, Enterprise = 5)
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

	const fromLicense = readLicenseQuota(license);
	if (fromLicense !== undefined) return fromLicense;

	const planName = license.getPlanName();
	return isPlanTier(planName) ? EVALUATION_TIER_DEFAULTS[planName] : 1;
}

/**
 * Mirror the precedence in {@link resolveEvaluationConcurrencyLimit} so the
 * telemetry tag reflects which branch actually fired. Kept side-effect-free
 * so callers can read it inline when building telemetry payloads.
 */
export function getEvaluationConcurrencyLimitSource(
	license: License,
): EvaluationConcurrencyLimitSource {
	if (process.env[EVALUATION_CONCURRENCY_ENV_VAR] !== undefined) return 'env';
	if (readLicenseQuota(license) !== undefined) return 'license';
	return 'tier';
}
