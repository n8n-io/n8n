import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import {
	EVALUATION_TIER_DEFAULTS,
	getEvaluationConcurrencyLimitSource,
	resolveEvaluationConcurrencyLimit,
} from '@/evaluation.ee/evaluation-concurrency.helper';
import type { License } from '@/license';

const ENV_VAR = 'N8N_CONCURRENCY_EVALUATION_LIMIT';

const buildConfig = (evaluationLimit: number): ExecutionsConfig =>
	({
		concurrency: { productionLimit: -1, evaluationLimit },
	}) as ExecutionsConfig;

const buildLicense = (planName: string): License =>
	mock<License>({ getPlanName: jest.fn().mockReturnValue(planName) });

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
			// Enterprise tier would otherwise default to 5; env must win.
			const result = resolveEvaluationConcurrencyLimit(
				buildConfig(Number(envValue)),
				buildLicense('Enterprise'),
			);
			expect(result).toBe(expected);
		});

		test('env empty string still counts as set (operator opt-in to default config value)', () => {
			process.env[ENV_VAR] = '';
			// Empty string is still "explicitly set" — the config's parsed
			// default is what flows through. Mirrors how decorators treat
			// presence-without-value as a deliberate operator choice.
			const result = resolveEvaluationConcurrencyLimit(buildConfig(-1), buildLicense('Community'));
			expect(result).toBe(-1);
		});
	});

	describe('tier defaults (env unset)', () => {
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
		expect(getEvaluationConcurrencyLimitSource()).toBe('env');
	});

	test('returns `tier` when the env var is unset', () => {
		delete process.env[ENV_VAR];
		expect(getEvaluationConcurrencyLimitSource()).toBe('tier');
	});
});
