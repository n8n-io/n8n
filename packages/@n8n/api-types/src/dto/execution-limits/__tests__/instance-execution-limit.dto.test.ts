import { EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING } from '../../../schemas/execution-limit-settings.schema';
import {
	InstanceExecutionLimitDto,
	PutInstanceExecutionLimitDto,
} from '../instance-execution-limit.dto';

describe('InstanceExecutionLimitDto and PutInstanceExecutionLimitDto', () => {
	const valid = {
		periodUnit: 'month',
		maxExecutions: 100_000,
		defaultProjectMaxExecutions: 10_000,
		version: 3,
	};

	test('accepts a full object with integer limits', () => {
		expect(PutInstanceExecutionLimitDto.parse(valid)).toEqual(valid);
		expect(InstanceExecutionLimitDto.parse(valid)).toEqual(valid);
	});

	test('accepts null limits and version 0 for a fresh instance', () => {
		const fresh = {
			periodUnit: 'month',
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		};

		expect(PutInstanceExecutionLimitDto.parse(fresh)).toEqual(fresh);
		expect(InstanceExecutionLimitDto.parse(fresh)).toEqual(fresh);
	});

	test('accepts limits at the ceiling', () => {
		const atCeiling = {
			periodUnit: 'day',
			maxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
			defaultProjectMaxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
			version: 1,
		};

		expect(PutInstanceExecutionLimitDto.safeParse(atCeiling).success).toBe(true);
	});

	test.each([
		['missing periodUnit', { maxExecutions: 10, defaultProjectMaxExecutions: null, version: 0 }],
		[
			'missing maxExecutions',
			{ periodUnit: 'month', defaultProjectMaxExecutions: null, version: 0 },
		],
		['missing defaultProjectMaxExecutions', { periodUnit: 'month', maxExecutions: 10, version: 0 }],
		[
			'missing version',
			{ periodUnit: 'month', maxExecutions: 10, defaultProjectMaxExecutions: null },
		],
		['unknown periodUnit', { ...valid, periodUnit: 'year' }],
		['zero maxExecutions', { ...valid, maxExecutions: 0 }],
		['negative maxExecutions', { ...valid, maxExecutions: -1 }],
		[
			'maxExecutions above ceiling',
			{ ...valid, maxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING + 1 },
		],
		['fractional maxExecutions', { ...valid, maxExecutions: 10.5 }],
		['zero defaultProjectMaxExecutions', { ...valid, defaultProjectMaxExecutions: 0 }],
		['negative version', { ...valid, version: -1 }],
		['fractional version', { ...valid, version: 1.5 }],
		['extra unknown field', { ...valid, extra: true }],
	])('PutInstanceExecutionLimitDto rejects %s', (_, payload) => {
		expect(PutInstanceExecutionLimitDto.safeParse(payload).success).toBe(false);
	});
});
