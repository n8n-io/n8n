import { EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING } from '../../../schemas/execution-limit-settings.schema';
import {
	InstanceExecutionLimitDto,
	PutInstanceExecutionLimitDto,
} from '../instance-execution-limit.dto';

describe('InstanceExecutionLimitDto and PutInstanceExecutionLimitDto', () => {
	const valid = {
		periodUnit: 'month' as const,
		maxExecutions: 100_000,
		defaultProjectMaxExecutions: 10_000,
		version: 3,
	};

	test('accepts a full object with caps', () => {
		expect(PutInstanceExecutionLimitDto.parse(valid)).toEqual(valid);
		expect(InstanceExecutionLimitDto.parse(valid)).toEqual(valid);
	});

	test('accepts a fresh instance shape with null caps and version 0', () => {
		const fresh = {
			periodUnit: 'month' as const,
			maxExecutions: null,
			defaultProjectMaxExecutions: null,
			version: 0,
		};

		expect(PutInstanceExecutionLimitDto.parse(fresh)).toEqual(fresh);
		expect(InstanceExecutionLimitDto.parse(fresh)).toEqual(fresh);
	});

	test('accepts caps at the ceiling', () => {
		const atCeiling = {
			...valid,
			maxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
			defaultProjectMaxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
		};

		expect(PutInstanceExecutionLimitDto.safeParse(atCeiling).success).toBe(true);
	});

	test.each([
		['missing periodUnit', { maxExecutions: 100, defaultProjectMaxExecutions: null, version: 0 }],
		[
			'missing maxExecutions',
			{ periodUnit: 'month', defaultProjectMaxExecutions: null, version: 0 },
		],
		[
			'missing defaultProjectMaxExecutions',
			{ periodUnit: 'month', maxExecutions: 100, version: 0 },
		],
		[
			'missing version',
			{ periodUnit: 'month', maxExecutions: 100, defaultProjectMaxExecutions: null },
		],
		['unknown periodUnit', { ...valid, periodUnit: 'year' }],
		['zero maxExecutions', { ...valid, maxExecutions: 0 }],
		['negative defaultProjectMaxExecutions', { ...valid, defaultProjectMaxExecutions: -1 }],
		['cap above ceiling', { ...valid, maxExecutions: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING + 1 }],
		['fractional maxExecutions', { ...valid, maxExecutions: 10.5 }],
		['negative version', { ...valid, version: -1 }],
		['fractional version', { ...valid, version: 1.2 }],
		['unknown extra field', { ...valid, extra: true }],
	])('PutInstanceExecutionLimitDto rejects %s', (_, payload) => {
		expect(PutInstanceExecutionLimitDto.safeParse(payload).success).toBe(false);
	});
});
