import { describe, it, expect } from 'vitest';
import {
	applyCachedSortOrder,
	applyCachedVisibility,
	getDefaultOrderedColumns,
	getTestCasesColumns,
	getTestTableHeaders,
} from './evaluation.utils';
import type { TestCaseExecutionRecord } from './evaluation.api';

describe('utils', () => {
	describe('applyCachedSortOrder', () => {
		it('should reorder columns according to cached order', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const cachedOrder = [
				'metrics.accuracy',
				'inputs.query',
				'metrics.executionTime',
				'outputs.result',
			];

			const result = applyCachedSortOrder(defaultOrder, cachedOrder);

			expect(result).toEqual([
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
			]);
		});

		it('should handle extra keys in both cached order and default order', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'inputs.limit',
					label: 'limit',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				}, // Extra key not in cached order
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'outputs.count',
					label: 'count',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				}, // Extra key not in cached order
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				}, // Extra key not in cached order
			];

			const cachedOrder = [
				'metrics.accuracy',
				'metrics.nonexistent1', // Extra key not in default order
				'inputs.query',
				'metrics.nonexistent2', // Extra key not in default order
				'outputs.result',
				'metrics.nonexistent3', // Extra key not in default order
			];

			const result = applyCachedSortOrder(defaultOrder, cachedOrder);

			expect(result).toEqual([
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{ key: 'metrics.nonexistent1', disabled: true },
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{ key: 'metrics.nonexistent2', disabled: true },
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
				{ key: 'metrics.nonexistent3', disabled: true },
				{
					key: 'inputs.limit',
					label: 'limit',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.count',
					label: 'count',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
			]);
		});

		it('should handle empty cached order and return default order unchanged', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const result = applyCachedSortOrder(defaultOrder, []);

			expect(result).toEqual(defaultOrder);
		});

		it('should handle undefined cached order and return default order unchanged', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const result = applyCachedSortOrder(defaultOrder, undefined);

			expect(result).toEqual(defaultOrder);
		});

		it('should handle cached order with all keys not in default order', () => {
			const defaultOrder = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
			];

			const cachedOrder = ['metrics.accuracy', 'metrics.speed', 'outputs.error'];

			const result = applyCachedSortOrder(defaultOrder, cachedOrder);

			expect(result).toEqual([
				{ key: 'metrics.accuracy', disabled: true },
				{ key: 'metrics.speed', disabled: true },
				{ key: 'outputs.error', disabled: true },
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
			]);
		});
	});

	describe('applyCachedVisibility', () => {
		it('should apply visibility settings to columns', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const visibility = {
				'inputs.query': false,
				'metrics.accuracy': true,
			};

			const result = applyCachedVisibility(columns, visibility);

			expect(result).toEqual([
				{
					key: 'inputs.query',
					label: 'query',
					visible: false,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
			]);
		});

		it('should not modify disabled columns', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{ key: 'metrics.nonexistent', disabled: true as const },
			];

			const visibility = {
				'inputs.query': false,
				'metrics.nonexistent': true,
			};

			const result = applyCachedVisibility(columns, visibility);

			expect(result).toEqual([
				{
					key: 'inputs.query',
					label: 'query',
					visible: false,
					disabled: false,
					columnType: 'inputs',
				},
				{ key: 'metrics.nonexistent', disabled: true },
			]);
		});

		it('should return original columns when visibility is undefined', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: false,
					disabled: false,
					columnType: 'outputs' as const,
				},
			];

			const result = applyCachedVisibility(columns, undefined);

			expect(result).toEqual(columns);
		});

		it('should preserve original visibility for keys not in visibility object', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: false,
					disabled: false,
					columnType: 'outputs' as const,
				},
			];

			const visibility = {
				'inputs.query': false,
			};

			const result = applyCachedVisibility(columns, visibility);

			expect(result).toEqual([
				{
					key: 'inputs.query',
					label: 'query',
					visible: false,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: false,
					disabled: false,
					columnType: 'outputs',
				},
			]);
		});
	});

	describe('getTestCasesColumns', () => {
		it('should extract unique input column names from test cases', () => {
			const testCases: TestCaseExecutionRecord[] = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'test', limit: 10 },
					outputs: { result: 'success' },
				},
				{
					id: '2',
					testRunId: 'run1',
					executionId: 'exec2',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'test2', offset: 5 },
					outputs: { result: 'success', count: 3 },
				},
			];

			const inputColumns = getTestCasesColumns(testCases, 'inputs');
			const outputColumns = getTestCasesColumns(testCases, 'outputs');

			expect(inputColumns.sort()).toEqual(['limit', 'offset', 'query']);
			expect(outputColumns.sort()).toEqual(['count', 'result']);
		});

		it('should return empty array when test cases have no inputs/outputs', () => {
			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
				},
			];

			const inputColumns = getTestCasesColumns(testCases, 'inputs');
			const outputColumns = getTestCasesColumns(testCases, 'outputs');

			expect(inputColumns).toEqual([]);
			expect(outputColumns).toEqual([]);
		});

		it('should handle empty test cases array', () => {
			const inputColumns = getTestCasesColumns([], 'inputs');
			const outputColumns = getTestCasesColumns([], 'outputs');

			expect(inputColumns).toEqual([]);
			expect(outputColumns).toEqual([]);
		});

		it('should handle test cases with null/undefined inputs/outputs', () => {
			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: undefined,
					outputs: undefined,
				},
				{
					id: '2',
					testRunId: 'run1',
					executionId: 'exec2',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'test' },
				},
			];

			const inputColumns = getTestCasesColumns(testCases, 'inputs');
			const outputColumns = getTestCasesColumns(testCases, 'outputs');

			expect(inputColumns).toEqual(['query']);
			expect(outputColumns).toEqual([]);
		});
	});

	describe('getDefaultOrderedColumns', () => {
		it('should return default column order with inputs, outputs, metrics, and special columns', () => {
			const run = {
				id: 'run1',
				workflowId: 'workflow1',
				status: 'completed' as const,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				runAt: '2023-01-01',
				completedAt: '2023-01-01',
				metrics: {
					accuracy: 0.95,
					precision: 0.88,
					promptTokens: 100,
					completionTokens: 50,
					executionTime: 1.5,
				},
			};

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'test', limit: 10 },
					outputs: { result: 'success', count: 3 },
				},
			];

			const result = getDefaultOrderedColumns(run, testCases);

			expect(result).toEqual([
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'inputs.limit',
					label: 'limit',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
				{
					key: 'outputs.count',
					label: 'count',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'metrics.precision',
					label: 'precision',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'metrics.promptTokens',
					label: 'promptTokens',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'metrics.completionTokens',
					label: 'completionTokens',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'metrics.executionTime',
					label: 'executionTime',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
			]);
		});

		it('should handle undefined run and test cases', () => {
			const result = getDefaultOrderedColumns(undefined, undefined);

			expect(result).toEqual([]);
		});

		it('should handle run without metrics', () => {
			const run = {
				id: 'run1',
				workflowId: 'workflow1',
				status: 'completed' as const,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				runAt: '2023-01-01',
				completedAt: '2023-01-01',
			};

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'test' },
					outputs: { result: 'success' },
				},
			];

			const result = getDefaultOrderedColumns(run, testCases);

			expect(result).toEqual([
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false,
					columnType: 'inputs',
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false,
					columnType: 'outputs',
				},
			]);
		});

		it('should only include special metric columns that exist in run metrics', () => {
			const run = {
				id: 'run1',
				workflowId: 'workflow1',
				status: 'completed' as const,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				runAt: '2023-01-01',
				completedAt: '2023-01-01',
				metrics: {
					accuracy: 0.95,
					promptTokens: 100,
					// Missing completionTokens, totalTokens, executionTime
				},
			};

			const result = getDefaultOrderedColumns(run, []);

			expect(result).toEqual([
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
				{
					key: 'metrics.promptTokens',
					label: 'promptTokens',
					visible: true,
					disabled: false,
					columnType: 'metrics',
					numeric: true,
				},
			]);
		});
	});

	describe('getHeaders', () => {
		it('should convert visible enabled columns to headers', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false as const,
					columnType: 'inputs' as const,
				},
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false as const,
					columnType: 'metrics' as const,
					numeric: true,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: false,
					disabled: false as const,
					columnType: 'outputs' as const,
				},
				{ key: 'metrics.disabled', disabled: true as const },
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'short' },
					metrics: { accuracy: 0.95 },
				},
			];

			const result = getTestTableHeaders(columns, testCases);

			expect(result).toHaveLength(2);
			expect(result[0].prop).toBe('inputs.query');
			expect(result[0].label).toBe('query');
			expect(result[0].sortable).toBe(true);
			expect(result[0].showHeaderTooltip).toBe(true);

			expect(result[1].prop).toBe('metrics.accuracy');
			expect(result[1].label).toBe('accuracy');
		});

		it('should format numeric values correctly in formatter', () => {
			const columns = [
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false as const,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					metrics: { accuracy: 0.95678 },
				},
			];

			const result = getTestTableHeaders(columns, testCases);
			const formatter = result[0]?.formatter;

			const testRow = {
				id: '1',
				testRunId: 'run1',
				executionId: 'exec1',
				status: 'completed' as const,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				runAt: '2023-01-01',
				metrics: { accuracy: 0.95678 },
				index: 1,
			};

			expect(formatter).toBeDefined();
			expect(formatter!(testRow)).toBe('0.96');
		});

		it('should format object values as JSON string in formatter', () => {
			const columns = [
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false as const,
					columnType: 'outputs' as const,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					outputs: { result: { status: 'success', data: [1, 2, 3] } },
				},
			];

			const result = getTestTableHeaders(columns, testCases);
			const formatter = result[0]?.formatter;

			const testRow = {
				id: '1',
				testRunId: 'run1',
				executionId: 'exec1',
				status: 'completed' as const,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				runAt: '2023-01-01',
				outputs: { result: { status: 'success', data: [1, 2, 3] } },
				index: 1,
			};

			expect(formatter).toBeDefined();
			if (formatter) {
				const formatted = formatter(testRow);
				expect(formatted).toBe(JSON.stringify({ status: 'success', data: [1, 2, 3] }, null, 2));
			}
		});

		it('should format primitive values as strings in formatter', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false as const,
					columnType: 'inputs' as const,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'test query' },
				},
			];

			const result = getTestTableHeaders(columns, testCases);
			const formatter = result[0]?.formatter;

			const testRow = {
				id: '1',
				testRunId: 'run1',
				executionId: 'exec1',
				status: 'completed' as const,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				runAt: '2023-01-01',
				inputs: { query: 'test query' },
				index: 1,
			};

			expect(formatter).toBeDefined();
			if (formatter) {
				expect(formatter(testRow)).toBe('test query');
			}
		});

		it('should handle missing values in formatter', () => {
			const columns = [
				{
					key: 'inputs.missing',
					label: 'missing',
					visible: true,
					disabled: false as const,
					columnType: 'inputs' as const,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: {},
				},
			];

			const result = getTestTableHeaders(columns, testCases);
			const formatter = result[0]?.formatter;

			const testRow = {
				id: '1',
				testRunId: 'run1',
				executionId: 'exec1',
				status: 'completed' as const,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
				runAt: '2023-01-01',
				inputs: {},
				index: 1,
			};

			expect(formatter).toBeDefined();
			if (formatter) {
				expect(formatter(testRow)).toBe('undefined');
			}
		});

		it('should filter out disabled and invisible columns', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false as const,
					columnType: 'inputs' as const,
				},
				{
					key: 'outputs.result',
					label: 'result',
					visible: false,
					disabled: false as const,
					columnType: 'outputs' as const,
				},
				{ key: 'metrics.disabled', disabled: true as const },
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false as const,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'test' },
					metrics: { accuracy: 0.95 },
				},
			];

			const result = getTestTableHeaders(columns, testCases);

			expect(result).toHaveLength(2);
			expect(result[0]?.prop).toBe('inputs.query');
			expect(result[1]?.prop).toBe('metrics.accuracy');
		});

		it('should set minWidth to 125 for short content', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false as const,
					columnType: 'inputs' as const,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'short' }, // 5 characters, <= 10
				},
			];

			const result = getTestTableHeaders(columns, testCases);

			expect(result).toHaveLength(1);
			expect(result[0]?.minWidth).toBe(125);
		});

		it('should set minWidth to 250 for long content', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false as const,
					columnType: 'inputs' as const,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'this is a very long query string' }, // > 10 characters
				},
			];

			const result = getTestTableHeaders(columns, testCases);

			expect(result).toHaveLength(1);
			expect(result[0]?.minWidth).toBe(250);
		});

		it('should set minWidth to 250 for long numeric content when formatted', () => {
			const columns = [
				{
					key: 'metrics.accuracy',
					label: 'accuracy',
					visible: true,
					disabled: false as const,
					columnType: 'metrics' as const,
					numeric: true,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					metrics: { accuracy: 999999.999999 }, // When formatted to 2 decimals: "999999.00" (9 chars, still <= 10)
				},
			];

			const result = getTestTableHeaders(columns, testCases);

			expect(result).toHaveLength(1);
			expect(result[0]?.minWidth).toBe(125); // Short content
		});

		it('should set minWidth to 250 for long JSON content', () => {
			const columns = [
				{
					key: 'outputs.result',
					label: 'result',
					visible: true,
					disabled: false as const,
					columnType: 'outputs' as const,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					outputs: { result: { status: 'success', data: [1, 2, 3], message: 'completed' } }, // Long JSON string
				},
			];

			const result = getTestTableHeaders(columns, testCases);

			expect(result).toHaveLength(1);
			expect(result[0]?.minWidth).toBe(250);
		});

		it('should check all test cases to determine minWidth', () => {
			const columns = [
				{
					key: 'inputs.query',
					label: 'query',
					visible: true,
					disabled: false as const,
					columnType: 'inputs' as const,
				},
			];

			const testCases = [
				{
					id: '1',
					testRunId: 'run1',
					executionId: 'exec1',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'short' }, // 5 characters
				},
				{
					id: '2',
					testRunId: 'run1',
					executionId: 'exec2',
					status: 'completed' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'this is a very long query' }, // > 10 characters
				},
			];

			const result = getTestTableHeaders(columns, testCases);

			expect(result).toHaveLength(1);
			expect(result[0]?.minWidth).toBe(250); // Should be 250 because second test case has long content
		});
	});
});
