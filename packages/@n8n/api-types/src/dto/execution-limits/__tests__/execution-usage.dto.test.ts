import { EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING } from '../../../schemas/execution-limit-settings.schema';
import {
	ExecutionUsageDto,
	toExecutionUsage,
	type ExecutionUsageSource,
} from '../execution-usage.dto';

const DTO_KEYS = [
	'periodUnit',
	'periodStart',
	'resetsAt',
	'maxExecutions',
	'workflowExecutions',
	'remaining',
];

const makeUsage = (executions: number): ExecutionUsageSource => ({
	period: {
		unit: 'month',
		firstDay: '2026-11-01',
		resetsAt: new Date('2026-12-01T00:00:00.000Z'),
	},
	executions,
});

const valid = {
	periodUnit: 'month',
	periodStart: '2026-11-01',
	resetsAt: '2026-12-01T00:00:00.000Z',
	maxExecutions: 100,
	workflowExecutions: 40,
	remaining: 60,
};

describe('toExecutionUsage', () => {
	describe('a scope with a limit', () => {
		test('maps each field and calculates remaining', () => {
			const result = toExecutionUsage(makeUsage(40), 100);

			expect(result).toEqual({
				periodUnit: 'month',
				periodStart: '2026-11-01',
				resetsAt: '2026-12-01T00:00:00.000Z',
				maxExecutions: 100,
				workflowExecutions: 40,
				remaining: 60,
			});
			expect(ExecutionUsageDto.safeParse(result).success).toBe(true);
		});

		test('returns the full limit as remaining when no executions are counted', () => {
			const result = toExecutionUsage(makeUsage(0), 100);

			expect(result.workflowExecutions).toBe(0);
			expect(result.remaining).toBe(100);
			expect(ExecutionUsageDto.safeParse(result).success).toBe(true);
		});

		test('returns 0 as remaining when the executions equal the limit', () => {
			const result = toExecutionUsage(makeUsage(100), 100);

			expect(result.remaining).toBe(0);
			expect(ExecutionUsageDto.safeParse(result).success).toBe(true);
		});
	});

	describe('a scope with no limit', () => {
		test('returns null for maxExecutions and remaining', () => {
			const result = toExecutionUsage(makeUsage(40), null);

			expect(result.maxExecutions).toBeNull();
			expect(result.remaining).toBeNull();
			expect(result.workflowExecutions).toBe(40);
			expect(ExecutionUsageDto.safeParse(result).success).toBe(true);
		});
	});

	describe('usage above the limit', () => {
		test('returns 0 as remaining', () => {
			const result = toExecutionUsage(makeUsage(150), 100);

			expect(result.workflowExecutions).toBe(150);
			expect(result.remaining).toBe(0);
			expect(ExecutionUsageDto.safeParse(result).success).toBe(true);
		});

		test('accepts a count above the limit ceiling', () => {
			const executions = EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING + 10;
			const result = toExecutionUsage(
				makeUsage(executions),
				EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING,
			);

			expect(result.workflowExecutions).toBe(executions);
			expect(result.remaining).toBe(0);
			expect(ExecutionUsageDto.safeParse(result).success).toBe(true);
		});
	});

	test('returns only the DTO fields', () => {
		const source = {
			scope: { type: 'instance' },
			period: {
				unit: 'week' as const,
				firstDay: '2026-11-23',
				lastDay: '2026-11-29',
				resetsAt: new Date('2026-11-30T00:00:00.000Z'),
			},
			executions: 5,
			lastCountedAt: new Date('2026-11-27T10:00:00.000Z'),
		};

		const result = toExecutionUsage(source, 10);

		expect(Object.keys(result).sort()).toEqual([...DTO_KEYS].sort());
		expect(result).toEqual({
			periodUnit: 'week',
			periodStart: '2026-11-23',
			resetsAt: '2026-11-30T00:00:00.000Z',
			maxExecutions: 10,
			workflowExecutions: 5,
			remaining: 5,
		});
	});
});

describe('ExecutionUsageDto', () => {
	test('removes unknown fields on parse', () => {
		const result = ExecutionUsageDto.parse({
			...valid,
			lastCountedAt: '2026-11-15T10:00:00.000Z',
			extra: true,
		});

		expect(result).toEqual(valid);
		expect(Object.keys(result).sort()).toEqual([...DTO_KEYS].sort());
	});

	test.each(DTO_KEYS)('rejects input without %s', (key) => {
		const input: Record<string, unknown> = { ...valid };
		delete input[key];

		expect(ExecutionUsageDto.safeParse(input).success).toBe(false);
	});

	test.each([
		{ field: 'periodUnit', value: 'year' },
		{ field: 'periodStart', value: '2026-11-01T00:00:00.000Z' },
		{ field: 'periodStart', value: '2026-02-30' },
		{ field: 'resetsAt', value: '2026-12-01' },
		{ field: 'maxExecutions', value: 0 },
		{ field: 'maxExecutions', value: -1 },
		{ field: 'maxExecutions', value: 1.5 },
		{ field: 'maxExecutions', value: EXECUTION_LIMIT_MAX_EXECUTIONS_CEILING + 1 },
		{ field: 'workflowExecutions', value: -1 },
		{ field: 'workflowExecutions', value: 1.5 },
		{ field: 'workflowExecutions', value: null },
		{ field: 'remaining', value: -1 },
		{ field: 'remaining', value: 1.5 },
	])('rejects $field: $value', ({ field, value }) => {
		expect(ExecutionUsageDto.safeParse({ ...valid, [field]: value }).success).toBe(false);
	});
});
