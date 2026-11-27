import { Container } from '@n8n/di';

import { ExecutionLimitsConfig } from '../execution-limits.config';

describe('ExecutionLimitsConfig', () => {
	const setRetention = (value: string | undefined) =>
		vi.stubEnv('N8N_EXECUTION_LIMITS_USAGE_RETENTION_DAYS', value);

	beforeEach(() => {
		Container.reset();
		setRetention(undefined);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('keeps the usage rows for 430 days by default', () => {
		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(430);
	});

	it('reads the retention from its environment variable', () => {
		setRetention('90');

		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(90);
	});

	it('accepts 31 days, the lowest allowed retention', () => {
		setRetention('31');

		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(31);
	});

	it('accepts 36500 days, the highest allowed retention', () => {
		setRetention('36500');

		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(36_500);
	});

	it.each(['30', '0', '-1', 'abc', '45.5', '36501', '1000000000'])(
		'falls back to 430 days when given %s',
		(value) => {
			setRetention(value);

			expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(430);
		},
	);
});
