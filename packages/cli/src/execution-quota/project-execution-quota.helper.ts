import type { License } from '@/license';

/**
 * Tier defaults applied when neither the env override nor the license quota
 * are set. Enterprise defaults to unlimited (-1) because the intended
 * control surface for Enterprise customers is the per-project override in
 * `project_execution_quota`, not an instance-wide default.
 */
export const PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS = {
	Community: 1000,
	Pro: 10000,
	Business: 100000,
	Enterprise: -1,
} as const;

const PROJECT_EXECUTION_LIMIT_ENV_VAR = 'N8N_PROJECT_EXECUTION_LIMIT_DEFAULT';
const PROJECT_EXECUTION_LIMIT_QUOTA = 'quota:project:executionLimit';

const isPlanTier = (name: string): name is keyof typeof PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS =>
	name in PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS;

function readLicenseQuota(license: License): number | undefined {
	const raw = license.getValue(PROJECT_EXECUTION_LIMIT_QUOTA);
	if (typeof raw !== 'number') return undefined;
	if (raw === 0) return undefined;
	return raw;
}

/**
 * Resolve the default per-project execution limit for this instance, used
 * when a project has no explicit `project_execution_quota` row of its own.
 *
 * Order of precedence, mirroring `resolveEvaluationConcurrencyLimit`:
 * 1. `N8N_PROJECT_EXECUTION_LIMIT_DEFAULT` env var (operator escape hatch)
 * 2. `quota:project:executionLimit` license entitlement
 * 3. License-tier default
 */
export function resolveDefaultProjectExecutionLimit(license: License): number {
	if (process.env[PROJECT_EXECUTION_LIMIT_ENV_VAR] !== undefined) {
		return Number(process.env[PROJECT_EXECUTION_LIMIT_ENV_VAR]);
	}

	const fromLicense = readLicenseQuota(license);
	if (fromLicense !== undefined) return fromLicense;

	const planName = license.getPlanName();
	return isPlanTier(planName) ? PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS[planName] : 1000;
}
