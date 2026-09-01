import { vi } from 'vitest';
import type { License } from '@/license';

import {
	resolveDefaultProjectExecutionLimit,
	PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS,
} from '../project-execution-quota.helper';

const ENV_VAR = 'N8N_PROJECT_EXECUTION_LIMIT_DEFAULT';

function mockLicense(overrides: { quota?: number; planName?: string } = {}): License {
	return {
		getValue: vi.fn().mockReturnValue(overrides.quota),
		getPlanName: vi.fn().mockReturnValue(overrides.planName ?? 'Community'),
	} as unknown as License;
}

describe('resolveDefaultProjectExecutionLimit', () => {
	const originalEnv = process.env[ENV_VAR];

	afterEach(() => {
		if (originalEnv === undefined) delete process.env[ENV_VAR];
		else process.env[ENV_VAR] = originalEnv;
	});

	it('returns the env var value when set, ignoring license and tier', () => {
		process.env[ENV_VAR] = '42';
		const license = mockLicense({ quota: 999, planName: 'Enterprise' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(42);
	});

	it('returns the license quota when set and env var is unset', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: 500 });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(500);
	});

	it('ignores a license quota of 0 and falls through to tier default', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: 0, planName: 'Business' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(
			PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS.Business,
		);
	});

	it('falls back to the tier default when license has no opinion', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: undefined, planName: 'Enterprise' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(
			PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS.Enterprise,
		);
	});

	it('defaults unknown plan names to 1000', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: undefined, planName: 'SomeFuturePlan' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(1000);
	});

	it('defaults Community to unlimited (-1) rather than an instance-wide cap', () => {
		delete process.env[ENV_VAR];
		const license = mockLicense({ quota: undefined, planName: 'Community' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(
			PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS.Community,
		);
		expect(PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS.Community).toBe(-1);
	});

	it('falls through to the license/tier precedence when the env var is malformed (NaN)', () => {
		process.env[ENV_VAR] = 'not-a-number';
		const license = mockLicense({ quota: 500, planName: 'Business' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(500);
	});

	it('falls through to the tier default when the malformed env var has no license opinion', () => {
		process.env[ENV_VAR] = 'not-a-number';
		const license = mockLicense({ quota: undefined, planName: 'Business' });

		expect(resolveDefaultProjectExecutionLimit(license)).toBe(
			PROJECT_EXECUTION_LIMIT_TIER_DEFAULTS.Business,
		);
	});
});
