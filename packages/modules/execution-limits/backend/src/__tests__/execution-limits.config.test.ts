import { Container } from '@n8n/di';

import { ExecutionLimitsConfig } from '../execution-limits.config';

describe('ExecutionLimitsConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_EXECUTION_LIMITS_USAGE_RETENTION_DAYS;
	});

	it('keeps the usage rows for 400 days by default', () => {
		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(400);
	});

	it('reads the retention from its environment variable', () => {
		process.env.N8N_EXECUTION_LIMITS_USAGE_RETENTION_DAYS = '90';

		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(90);
	});

	it('accepts 31 days, the lowest allowed retention', () => {
		process.env.N8N_EXECUTION_LIMITS_USAGE_RETENTION_DAYS = '31';

		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(31);
	});

	it.each(['30', '0', '-1', 'abc', '45.5'])('falls back to 400 days when given %s', (value) => {
		process.env.N8N_EXECUTION_LIMITS_USAGE_RETENTION_DAYS = value;

		expect(Container.get(ExecutionLimitsConfig).usageRetentionDays).toBe(400);
	});
});
