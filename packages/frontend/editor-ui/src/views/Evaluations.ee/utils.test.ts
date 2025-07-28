import { describe, it, expect } from 'vitest';
import { getTestCasesColumns } from './utils';
import type { TestCaseExecutionRecord } from '../../api/evaluation.ee';
import { mock } from 'vitest-mock-extended';

describe('utils', () => {
	describe('getTestCasesColumns', () => {
		const mockTestCases: TestCaseExecutionRecord[] = [
			mock<TestCaseExecutionRecord>({
				id: 'test-case-1',
				testRunId: 'test-run-1',
				executionId: 'execution-1',
				status: 'completed',
				createdAt: '2023-10-01T10:00:00Z',
				updatedAt: '2023-10-01T10:00:00Z',
				runAt: '2023-10-01T10:00:00Z',
				inputs: {
					query: 'test query',
					limit: 10,
					category: 'test',
				},
				outputs: {
					result: 'success',
					count: 5,
				},
				metrics: {
					accuracy: 0.95,
				},
			}),
			mock<TestCaseExecutionRecord>({
				id: 'test-case-2',
				testRunId: 'test-run-1',
				executionId: 'execution-2',
				status: 'completed',
				createdAt: '2023-10-01T10:01:00Z',
				updatedAt: '2023-10-01T10:01:00Z',
				runAt: '2023-10-01T10:01:00Z',
				inputs: {
					query: 'another query',
					limit: 20,
					filter: 'active',
				},
				outputs: {
					result: 'success',
					data: { items: [] },
				},
				metrics: {
					accuracy: 0.88,
				},
			}),
			mock<TestCaseExecutionRecord>({
				id: 'test-case-3',
				testRunId: 'test-run-1',
				executionId: 'execution-3',
				status: 'error',
				createdAt: '2023-10-01T10:02:00Z',
				updatedAt: '2023-10-01T10:02:00Z',
				runAt: '2023-10-01T10:02:00Z',
				inputs: {
					query: 'error query',
					timeout: 5000,
				},
				outputs: {
					error: 'timeout occurred',
				},
				metrics: {
					accuracy: 0.0,
				},
			}),
		];

		it('should extract input columns from test cases', () => {
			const columns = getTestCasesColumns(mockTestCases, 'inputs');

			expect(columns).toHaveLength(5);

			const columnProps = columns.map((col) => col.prop);
			expect(columnProps).toContain('inputs.query');
			expect(columnProps).toContain('inputs.limit');
			expect(columnProps).toContain('inputs.category');
			expect(columnProps).toContain('inputs.filter');
			expect(columnProps).toContain('inputs.timeout');
		});

		it('should extract output columns from test cases', () => {
			const columns = getTestCasesColumns(mockTestCases, 'outputs');

			expect(columns).toHaveLength(4);

			const columnProps = columns.map((col) => col.prop);
			expect(columnProps).toContain('outputs.result');
			expect(columnProps).toContain('outputs.count');
			expect(columnProps).toContain('outputs.data');
			expect(columnProps).toContain('outputs.error');
		});

		it('should return columns with correct structure', () => {
			const columns = getTestCasesColumns(mockTestCases, 'inputs');
			const firstColumn = columns[0];

			expect(firstColumn).toHaveProperty('prop');
			expect(firstColumn).toHaveProperty('label');
			expect(firstColumn).toHaveProperty('sortable', true);
			expect(firstColumn).toHaveProperty('filter', true);
			expect(firstColumn).toHaveProperty('showHeaderTooltip', true);
		});

		it('should set correct label for columns', () => {
			const columns = getTestCasesColumns(mockTestCases, 'inputs');
			const queryColumn = columns.find((col) => col.prop === 'inputs.query');

			expect(queryColumn?.label).toBe('query');
		});

		it('should handle empty test cases array', () => {
			const columns = getTestCasesColumns([], 'inputs');

			expect(columns).toHaveLength(0);
		});

		it('should handle test cases with no inputs', () => {
			const testCasesWithoutInputs: TestCaseExecutionRecord[] = [
				mock<TestCaseExecutionRecord>({
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					inputs: {},
					outputs: {
						result: 'success',
					},
					metrics: {
						accuracy: 0.95,
					},
				}),
			];

			const columns = getTestCasesColumns(testCasesWithoutInputs, 'inputs');

			expect(columns).toHaveLength(0);
		});

		it('should handle test cases with no outputs', () => {
			const testCasesWithoutOutputs: TestCaseExecutionRecord[] = [
				mock<TestCaseExecutionRecord>({
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					inputs: {
						query: 'test',
					},
					outputs: {},
					metrics: {
						accuracy: 0.95,
					},
				}),
			];

			const columns = getTestCasesColumns(testCasesWithoutOutputs, 'outputs');

			expect(columns).toHaveLength(0);
		});

		it('should handle test cases with undefined inputs', () => {
			const testCasesWithUndefinedInputs: TestCaseExecutionRecord[] = [
				{
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					outputs: {
						result: 'success',
					},
					metrics: {
						accuracy: 0.95,
					},
				},
			];

			const columns = getTestCasesColumns(testCasesWithUndefinedInputs, 'inputs');

			expect(columns).toHaveLength(0);
		});

		it('should handle test cases with undefined outputs', () => {
			const testCasesWithUndefinedOutputs: TestCaseExecutionRecord[] = [
				{
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					inputs: {
						query: 'test',
					},
					metrics: {
						accuracy: 0.95,
					},
				},
			];

			const columns = getTestCasesColumns(testCasesWithUndefinedOutputs, 'outputs');

			expect(columns).toHaveLength(0);
		});

		it('should handle mixed test cases with some having empty inputs/outputs', () => {
			const mixedTestCases: TestCaseExecutionRecord[] = [
				mock<TestCaseExecutionRecord>({
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					inputs: {
						query: 'test query',
						limit: 10,
					},
					outputs: {
						result: 'success',
					},
					metrics: {
						accuracy: 0.95,
					},
				}),
				mock<TestCaseExecutionRecord>({
					id: 'test-case-2',
					testRunId: 'test-run-1',
					executionId: 'execution-2',
					status: 'completed',
					createdAt: '2023-10-01T10:01:00Z',
					updatedAt: '2023-10-01T10:01:00Z',
					runAt: '2023-10-01T10:01:00Z',
					inputs: {},
					outputs: {
						result: 'success',
						count: 5,
					},
					metrics: {
						accuracy: 0.88,
					},
				}),
				mock<TestCaseExecutionRecord>({
					id: 'test-case-3',
					testRunId: 'test-run-1',
					executionId: 'execution-3',
					status: 'completed',
					createdAt: '2023-10-01T10:02:00Z',
					updatedAt: '2023-10-01T10:02:00Z',
					runAt: '2023-10-01T10:02:00Z',
					inputs: {
						filter: 'active',
					},
					outputs: {},
					metrics: {
						accuracy: 0.92,
					},
				}),
			];

			const inputColumns = getTestCasesColumns(mixedTestCases, 'inputs');
			const outputColumns = getTestCasesColumns(mixedTestCases, 'outputs');

			expect(inputColumns).toHaveLength(3);
			expect(outputColumns).toHaveLength(2);

			const inputProps = inputColumns.map((col) => col.prop);
			expect(inputProps).toContain('inputs.query');
			expect(inputProps).toContain('inputs.limit');
			expect(inputProps).toContain('inputs.filter');

			const outputProps = outputColumns.map((col) => col.prop);
			expect(outputProps).toContain('outputs.result');
			expect(outputProps).toContain('outputs.count');
		});

		it('should remove duplicate columns from multiple test cases', () => {
			const testCasesWithDuplicates: TestCaseExecutionRecord[] = [
				mock<TestCaseExecutionRecord>({
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					inputs: {
						query: 'test query 1',
						limit: 10,
					},
					outputs: {
						result: 'success',
					},
					metrics: {
						accuracy: 0.95,
					},
				}),
				mock<TestCaseExecutionRecord>({
					id: 'test-case-2',
					testRunId: 'test-run-1',
					executionId: 'execution-2',
					status: 'completed',
					createdAt: '2023-10-01T10:01:00Z',
					updatedAt: '2023-10-01T10:01:00Z',
					runAt: '2023-10-01T10:01:00Z',
					inputs: {
						query: 'test query 2',
						limit: 20,
					},
					outputs: {
						result: 'success',
					},
					metrics: {
						accuracy: 0.88,
					},
				}),
			];

			const inputColumns = getTestCasesColumns(testCasesWithDuplicates, 'inputs');
			const outputColumns = getTestCasesColumns(testCasesWithDuplicates, 'outputs');

			expect(inputColumns).toHaveLength(2);
			expect(outputColumns).toHaveLength(1);
		});

		it('should handle complex nested object keys', () => {
			const testCasesWithComplexKeys: TestCaseExecutionRecord[] = [
				mock<TestCaseExecutionRecord>({
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					inputs: {
						'user.name': 'John Doe',
						'user.email': 'john@example.com',
						'config.timeout': 5000,
						'config.retries': 3,
					},
					outputs: {
						'response.status': 200,
						'response.data': { success: true },
					},
					metrics: {
						accuracy: 0.95,
					},
				}),
			];

			const inputColumns = getTestCasesColumns(testCasesWithComplexKeys, 'inputs');
			const outputColumns = getTestCasesColumns(testCasesWithComplexKeys, 'outputs');

			expect(inputColumns).toHaveLength(4);
			expect(outputColumns).toHaveLength(2);

			const inputLabels = inputColumns.map((col) => col.label);
			expect(inputLabels).toContain('user.name');
			expect(inputLabels).toContain('user.email');
			expect(inputLabels).toContain('config.timeout');
			expect(inputLabels).toContain('config.retries');

			const outputLabels = outputColumns.map((col) => col.label);
			expect(outputLabels).toContain('response.status');
			expect(outputLabels).toContain('response.data');
		});

		it('should maintain consistent column order across multiple calls', () => {
			const columns1 = getTestCasesColumns(mockTestCases, 'inputs');
			const columns2 = getTestCasesColumns(mockTestCases, 'inputs');

			expect(columns1.map((col) => col.prop)).toEqual(columns2.map((col) => col.prop));
		});

		it('should handle single test case', () => {
			const singleTestCase: TestCaseExecutionRecord[] = [
				mock<TestCaseExecutionRecord>({
					id: 'test-case-1',
					testRunId: 'test-run-1',
					executionId: 'execution-1',
					status: 'completed',
					createdAt: '2023-10-01T10:00:00Z',
					updatedAt: '2023-10-01T10:00:00Z',
					runAt: '2023-10-01T10:00:00Z',
					inputs: {
						query: 'single test',
					},
					outputs: {
						result: 'success',
					},
					metrics: {
						accuracy: 0.95,
					},
				}),
			];

			const inputColumns = getTestCasesColumns(singleTestCase, 'inputs');
			const outputColumns = getTestCasesColumns(singleTestCase, 'outputs');

			expect(inputColumns).toHaveLength(1);
			expect(outputColumns).toHaveLength(1);
			expect(inputColumns[0].prop).toBe('inputs.query');
			expect(outputColumns[0].prop).toBe('outputs.result');
		});
	});
});
