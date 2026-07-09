import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import {
	EVALUATION_TIER_DEFAULTS,
	getEvaluationConcurrencyLimitSource,
	resolveEvaluationConcurrencyLimit,
} from '@/evaluation.ee/evaluation-concurrency.helper';
import type { License } from '@/license';

const ENV_VAR = 'N8N_CONCURRENCY_EVALUATION_LIMIT';
const QUOTA_KEY = 'quota:evaluations:concurrencyLimit';

const buildConfig = (evaluationLimit: number): ExecutionsConfig =>
	({
		concurrency: { productionLimit: -1, evaluationLimit },
	}) as ExecutionsConfig;

const buildLicense = (planName: string, licenseQuota?: number): License => {
	const getValue = vi.fn((feature: string) => (feature === QUOTA_KEY ? licenseQuota : undefined));
	return mock<License>({
		getPlanName: vi.fn().mockReturnValue(planName),
		getValue: getValue as never,
	});
};

describe('resolveEvaluationConcurrencyLimit', () => {
	const originalEnv = process.env[ENV_VAR];

	afterEach(() => {
		if (originalEnv === undefined) delete process.env[ENV_VAR];
		else process.env[ENV_VAR] = originalEnv;
	});

	describe('env override wins', () => {
		test.each([
			['unlimited', '-1', -1],
			['capped to 1', '1', 1],
			['capped to 7', '7', 7],
		])('%s → returns parsed value regardless of tier', (_label, envValue, expected) => {
			process.env[ENV_VAR] = envValue;
			// Enterprise tier and a license quota would otherwise both apply;
			// env must beat both.
			const result = resolveEvaluationConcurrencyLimit(
				buildConfig(Number(envValue)),
				buildLicense('Enterprise', 9),
			);
			expect(result).toBe(expected);
		});

		test('env empty string still counts as set (operator opt-in to default config value)', () => {
			process.env[ENV_VAR] = '';
			// Empty string is still "explicitly set" — the config's parsed
			// default is what flows through. Mirrors how decorators treat
			// presence-without-value as a deliberate operator choice.
			const result = resolveEvaluationConcurrencyLimit(
				buildConfig(-1),
				buildLicense('Community', 3),
			);
			expect(result).toBe(-1);
		});
	});

	describe('license quota (env unset)', () => {
		beforeEach(() => {
			delete process.env[ENV_VAR];
		});

		test('license-issued positive cap wins over tier default', () => {
			// Community would normally land at 1; the per-customer license
			// quota lifts that to 4 without a code change.
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Community', 4))).toBe(
				4,
			);
		});

		test('license-issued -1 unlocks unlimited regardless of tier', () => {
			// Mirrors env-var semantics: -1 = unlimited.
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Business', -1))).toBe(
				-1,
			);
		});

		test('license quota of 0 is treated as absent and falls through to tier default', () => {
			// `0` would mean a zero-capacity queue if honoured, which is
			// meaningless. We treat it as "license has no opinion" so the
			// customer drops to the tier default rather than getting bricked.
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Business', 0))).toBe(
				EVALUATION_TIER_DEFAULTS.Business,
			);
		});
	});

	describe('tier defaults (env unset, license absent)', () => {
		beforeEach(() => {
			delete process.env[ENV_VAR];
		});

		test('Community → 1', () => {
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Community'))).toBe(
				EVALUATION_TIER_DEFAULTS.Community,
			);
		});

		test('Pro → 1', () => {
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Pro'))).toBe(
				EVALUATION_TIER_DEFAULTS.Pro,
			);
		});

		test('Business → 3', () => {
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Business'))).toBe(
				EVALUATION_TIER_DEFAULTS.Business,
			);
		});

		test('Enterprise → 5', () => {
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Enterprise'))).toBe(
				EVALUATION_TIER_DEFAULTS.Enterprise,
			);
		});

		test('unknown plan name → falls back to sequential (1)', () => {
			// Unmapped tiers (custom plans, new tiers not yet wired up here)
			// land on sequential — safer than handing parallel access to a
			// licence we haven't accounted for.
			expect(resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Mystery Plan'))).toBe(
				1,
			);
		});
	});
});

describe('getEvaluationConcurrencyLimitSource', () => {
	const originalEnv = process.env[ENV_VAR];

	afterEach(() => {
		if (originalEnv === undefined) delete process.env[ENV_VAR];
		else process.env[ENV_VAR] = originalEnv;
	});

	test('returns `env` when the env var is set', () => {
		process.env[ENV_VAR] = '3';
		expect(getEvaluationConcurrencyLimitSource(buildLicense('Enterprise', 5))).toBe('env');
	});

	test('returns `license` when env is unset and the license quota is present', () => {
		delete process.env[ENV_VAR];
		expect(getEvaluationConcurrencyLimitSource(buildLicense('Community', 4))).toBe('license');
	});

	test('returns `tier` when env is unset and the license has no concurrency quota', () => {
		delete process.env[ENV_VAR];
		expect(getEvaluationConcurrencyLimitSource(buildLicense('Enterprise'))).toBe('tier');
	});

	test('returns `tier` when env is unset and the license quota is 0 (treated as absent)', () => {
		delete process.env[ENV_VAR];
		expect(getEvaluationConcurrencyLimitSource(buildLicense('Business', 0))).toBe('tier');
	});
});
