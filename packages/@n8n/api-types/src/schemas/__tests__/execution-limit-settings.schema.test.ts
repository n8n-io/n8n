import {
	EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
	executionLimitSettingsSchema,
} from '../execution-limit-settings.schema';

describe('executionLimitSettingsSchema', () => {
	const valid = { periodUnit: 'month', maxExecutions: 100_000, defaultProjectMaxExecutions: 5_000 };

	test.each([
		['both caps', valid],
		[
			'a cap at the int column limit',
			{ ...valid, maxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING },
		],
	])('accepts a period with %s', (_, value) => {
		expect(executionLimitSettingsSchema.safeParse(value).success).toBe(true);
	});

	test('accepts a period with no caps', () => {
		const result = executionLimitSettingsSchema.safeParse({
			periodUnit: 'day',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
		});

		expect(result.success).toBe(true);
	});

	test.each([
		['an unknown period', { ...valid, periodUnit: 'year' }],
		['a missing period', { maxExecutions: 1, defaultProjectMaxExecutions: 1 }],
		['a zero cap', { ...valid, maxExecutions: 0 }],
		['a negative cap', { ...valid, defaultProjectMaxExecutions: -1 }],
		[
			'a cap above the int column limit',
			{ ...valid, maxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING + 1 },
		],
		['a missing cap', { periodUnit: 'day', maxExecutions: null }],
		['a string cap', { ...valid, maxExecutions: '100' }],
		['a fractional cap', { ...valid, defaultProjectMaxExecutions: 1.5 }],
		['an unknown field', { ...valid, alertAtPercent: 80 }],
	])('rejects %s', (_, value) => {
		expect(executionLimitSettingsSchema.safeParse(value).success).toBe(false);
	});
});
