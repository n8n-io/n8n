import {
	DEFAULT_EXECUTION_LIMIT_SETTINGS,
	EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
	executionLimitMaxExecutionsSchema,
	executionLimitSettingsSchema,
} from '../execution-limit-settings.schema';

describe('executionLimitMaxExecutionsSchema', () => {
	test('rejects null, because a project limit always has a value', () => {
		expect(executionLimitMaxExecutionsSchema.safeParse(null).success).toBe(false);
	});
});

describe('DEFAULT_EXECUTION_LIMIT_SETTINGS', () => {
	test('is a valid settings row with a monthly period, no caps, and version 0', () => {
		expect(executionLimitSettingsSchema.parse(DEFAULT_EXECUTION_LIMIT_SETTINGS)).toEqual({
			periodUnit: 'month',
			instanceMaxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});
	});
});

describe('executionLimitSettingsSchema', () => {
	const valid = {
		periodUnit: 'month',
		instanceMaxExecutions: 100_000,
		defaultProjectMaxExecutions: 5_000,
		version: 3,
	};

	test.each([
		['both caps', valid],
		[
			'a cap at the int column limit',
			{ ...valid, instanceMaxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING },
		],
	])('accepts a period with %s', (_, value) => {
		expect(executionLimitSettingsSchema.safeParse(value).success).toBe(true);
	});

	test('accepts a period with no caps', () => {
		const result = executionLimitSettingsSchema.safeParse({
			periodUnit: 'day',
			instanceMaxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		});

		expect(result.success).toBe(true);
	});

	test('reads a stored row without version as version 0', () => {
		const { version: _version, ...legacyRow } = valid;

		expect(executionLimitSettingsSchema.parse(legacyRow)).toEqual({ ...legacyRow, version: 0 });
	});

	test('reads a row that a newer version saved with an extra field', () => {
		const result = executionLimitSettingsSchema.parse({ ...valid, alertAtPercent: 80 });

		expect(result).toEqual(valid);
	});

	test.each([
		['an unknown period', { ...valid, periodUnit: 'year' }],
		['a missing period', { instanceMaxExecutions: 1, defaultProjectMaxExecutions: 1 }],
		['a zero cap', { ...valid, instanceMaxExecutions: 0 }],
		['a negative cap', { ...valid, defaultProjectMaxExecutions: -1 }],
		[
			'a cap above the int column limit',
			{ ...valid, instanceMaxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING + 1 },
		],
		['a missing cap', { periodUnit: 'day', instanceMaxExecutions: null }],
		['a string cap', { ...valid, instanceMaxExecutions: '100' }],
		['a fractional cap', { ...valid, defaultProjectMaxExecutions: 1.5 }],
		['a negative version', { ...valid, version: -1 }],
		['a fractional version', { ...valid, version: 1.5 }],
		['a string version', { ...valid, version: '1' }],
		['a null version', { ...valid, version: null }],
	])('rejects %s', (_, value) => {
		expect(executionLimitSettingsSchema.safeParse(value).success).toBe(false);
	});
});
