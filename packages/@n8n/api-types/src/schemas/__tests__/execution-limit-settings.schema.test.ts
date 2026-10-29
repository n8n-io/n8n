import { executionLimitSettingsSchema } from '../execution-limit-settings.schema';

describe('executionLimitSettingsSchema', () => {
	const valid = { periodUnit: 'month', pauseAfter: 100_000, defaultProjectPauseAfter: 5_000 };

	test('accepts a period with both caps', () => {
		expect(executionLimitSettingsSchema.safeParse(valid).success).toBe(true);
	});

	test('accepts a period with no caps', () => {
		const result = executionLimitSettingsSchema.safeParse({
			periodUnit: 'day',
			pauseAfter: null,
			defaultProjectPauseAfter: null,
		});

		expect(result.success).toBe(true);
	});

	test.each([
		['an unknown period', { ...valid, periodUnit: 'year' }],
		['a missing period', { pauseAfter: 1, defaultProjectPauseAfter: 1 }],
		['a zero cap', { ...valid, pauseAfter: 0 }],
		['a fractional cap', { ...valid, defaultProjectPauseAfter: 1.5 }],
		['an unknown field', { ...valid, alertAtPercent: 80 }],
	])('rejects %s', (_, value) => {
		expect(executionLimitSettingsSchema.safeParse(value).success).toBe(false);
	});
});
