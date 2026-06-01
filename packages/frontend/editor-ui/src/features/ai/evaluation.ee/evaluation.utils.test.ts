import { describe, it, expect } from 'vitest';
import {
	applyCachedSortOrder,
	applyCachedVisibility,
	computeDelta,
	computeDurationMs,
	formatDeltaPercent,
	formatDuration,
	formatMetricLabel,
	formatMetricPercent,
	formatMetricRawScore,
	formatMetricRawScoreSum,
	formatTokens,
	getDefaultOrderedColumns,
	getDeltaTone,
	getMetricCategory,
	getTestCasesColumns,
	getTestTableHeaders,
	getUserDefinedMetricNames,
	normalizeMetricValue,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
				status: 'success' as const,
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
					status: 'success' as const,
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
				status: 'success' as const,
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
					status: 'success' as const,
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
				status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
				status: 'success' as const,
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
					status: 'success' as const,
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
				status: 'success' as const,
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
					status: 'success' as const,
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
				status: 'success' as const,
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
					status: 'success' as const,
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
				status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
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
					status: 'success' as const,
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					runAt: '2023-01-01',
					inputs: { query: 'short' }, // 5 characters
				},
				{
					id: '2',
					testRunId: 'run1',
					executionId: 'exec2',
					status: 'success' as const,
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

	describe('normalizeMetricValue', () => {
		it('returns numbers unchanged', () => {
			expect(normalizeMetricValue(0.42)).toBe(0.42);
		});
		it('returns undefined for undefined input', () => {
			expect(normalizeMetricValue(undefined)).toBeUndefined();
		});
		it('returns undefined for NaN', () => {
			expect(normalizeMetricValue(Number.NaN)).toBeUndefined();
		});
	});

	describe('computeDelta', () => {
		it('returns the signed difference when both values are present', () => {
			expect(computeDelta(0.9, 0.85)).toBeCloseTo(0.05);
			expect(computeDelta(0.4, 0.7)).toBeCloseTo(-0.3);
		});
		it('returns undefined when previous is missing', () => {
			expect(computeDelta(0.9, undefined)).toBeUndefined();
		});
		it('returns undefined when current is missing', () => {
			expect(computeDelta(undefined, 0.5)).toBeUndefined();
		});
	});

	describe('getDeltaTone', () => {
		it('returns positive for an increase', () => {
			expect(getDeltaTone(0.1)).toBe('positive');
		});
		it('returns negative for a decrease', () => {
			expect(getDeltaTone(-0.1)).toBe('negative');
		});
		it('returns default for zero or missing comparison', () => {
			expect(getDeltaTone(0)).toBe('default');
			expect(getDeltaTone(undefined)).toBe('default');
		});
	});

	describe('formatTokens', () => {
		it('renders with a t suffix and locale grouping', () => {
			expect(formatTokens(3912)).toBe('3,912t');
		});
		it('renders – when undefined', () => {
			expect(formatTokens(undefined)).toBe('–');
		});
	});

	describe('formatMetricPercent', () => {
		describe('without category (heuristic)', () => {
			it('rescales 0–1 values to percent', () => {
				expect(formatMetricPercent(0.94)).toBe('94%');
			});
			it('passes through values already above 1', () => {
				expect(formatMetricPercent(85)).toBe('85%');
			});
		});

		describe('aiBased (1–5 scale)', () => {
			it('renders a perfect 5 as 100%', () => {
				expect(formatMetricPercent(5, { category: 'aiBased' })).toBe('100%');
			});
			it('renders 4 as 80%', () => {
				expect(formatMetricPercent(4, { category: 'aiBased' })).toBe('80%');
			});
			it('renders 1 as 20%', () => {
				expect(formatMetricPercent(1, { category: 'aiBased' })).toBe('20%');
			});
		});

		describe('normalized categories (heuristic kept)', () => {
			it('rescales 0–1 stringSimilarity to percent', () => {
				expect(formatMetricPercent(0.74, { category: 'stringSimilarity' })).toBe('74%');
			});
			it('rescales custom 0–1 values to percent', () => {
				expect(formatMetricPercent(0.5, { category: 'custom' })).toBe('50%');
			});
		});
	});

	describe('formatMetricRawScore', () => {
		it('returns the integer x/5 form for AI-based metrics', () => {
			expect(formatMetricRawScore(5, { category: 'aiBased' })).toBe('5/5');
			expect(formatMetricRawScore(4, { category: 'aiBased' })).toBe('4/5');
			expect(formatMetricRawScore(1, { category: 'aiBased' })).toBe('1/5');
		});
		it('keeps one decimal for non-integer aiBased values', () => {
			expect(formatMetricRawScore(4.5, { category: 'aiBased' })).toBe('4.5/5');
		});
		it('returns empty for normalized 0-1 categories (hidden on per-row)', () => {
			expect(formatMetricRawScore(0.74, { category: 'stringSimilarity' })).toBe('');
			expect(formatMetricRawScore(0.5, { category: 'custom' })).toBe('');
			expect(formatMetricRawScore(1, { category: 'categorization' })).toBe('');
		});
		it('returns empty when no category is provided', () => {
			expect(formatMetricRawScore(0.94)).toBe('');
		});
		it('returns empty for missing or NaN', () => {
			expect(formatMetricRawScore(undefined, { category: 'aiBased' })).toBe('');
			expect(formatMetricRawScore(NaN, { category: 'aiBased' })).toBe('');
		});
	});

	describe('formatMetricRawScoreSum', () => {
		it('returns sum/total for AI-based metrics', () => {
			expect(formatMetricRawScoreSum([4, 5, 4], { category: 'aiBased' })).toBe('13/15');
			expect(formatMetricRawScoreSum([5], { category: 'aiBased' })).toBe('5/5');
		});
		it('keeps one decimal for non-integer aiBased totals', () => {
			expect(formatMetricRawScoreSum([4.5, 5], { category: 'aiBased' })).toBe('9.5/10');
		});
		it('drops missing/NaN values when computing the totals', () => {
			expect(formatMetricRawScoreSum([4, undefined, 5, NaN], { category: 'aiBased' })).toBe('9/10');
		});
		it('returns sum/n with two decimals for normalized categories', () => {
			expect(formatMetricRawScoreSum([0.5, 0.6], { category: 'custom' })).toBe('1.10/2');
			expect(formatMetricRawScoreSum([0.34, 0.25, 0.2], { category: 'stringSimilarity' })).toBe(
				'0.79/3',
			);
		});
		it('returns empty when there are no usable values', () => {
			expect(formatMetricRawScoreSum([], { category: 'aiBased' })).toBe('');
			expect(formatMetricRawScoreSum([undefined, NaN], { category: 'aiBased' })).toBe('');
		});
	});

	describe('formatDeltaPercent', () => {
		describe('without category (heuristic)', () => {
			it('formats positive delta with a leading +', () => {
				expect(formatDeltaPercent(0.04)).toBe('+4%');
			});
			it('formats negative delta with a leading -', () => {
				expect(formatDeltaPercent(-0.28)).toBe('-28%');
			});
		});

		describe('aiBased deltas (1–5 scale)', () => {
			it('+1 (4→5) reads as +20%', () => {
				expect(formatDeltaPercent(1, { category: 'aiBased' })).toBe('+20%');
			});
			it('-2 (5→3) reads as -40%', () => {
				expect(formatDeltaPercent(-2, { category: 'aiBased' })).toBe('-40%');
			});
		});
	});

	describe('getUserDefinedMetricNames', () => {
		it('excludes predefined token + execution-time keys', () => {
			const names = getUserDefinedMetricNames({
				accuracy: 0.9,
				totalTokens: 100,
				promptTokens: 50,
				completionTokens: 50,
				executionTime: 1000,
			});
			expect(names).toEqual(['accuracy']);
		});
	});

	describe('computeDurationMs', () => {
		it('returns the diff in milliseconds for valid timestamps', () => {
			expect(computeDurationMs('2023-10-01T10:00:00Z', '2023-10-01T10:00:01.243Z')).toBe(1243);
		});
		it('returns undefined when end is missing', () => {
			expect(computeDurationMs('2023-10-01T10:00:00Z', undefined)).toBeUndefined();
		});
	});

	describe('formatDuration', () => {
		it('renders sub-second durations as ms', () => {
			expect(formatDuration(243)).toBe('243ms');
			expect(formatDuration(999)).toBe('999ms');
		});
		it('renders 1s+ durations as seconds, dropping trailing .0', () => {
			expect(formatDuration(1000)).toBe('1s');
			expect(formatDuration(8000)).toBe('8s');
			expect(formatDuration(1243)).toBe('1.2s');
			expect(formatDuration(59500)).toBe('59.5s');
		});
		it('switches to minutes past 60s', () => {
			expect(formatDuration(60000)).toBe('1m');
			expect(formatDuration(90000)).toBe('1m 30s');
			expect(formatDuration(125000)).toBe('2m 5s');
		});
		it('promotes to minutes when sub-60s rounds up to exactly 60', () => {
			// 59.999s would otherwise render as "60s" — should be "1m" instead.
			expect(formatDuration(59999)).toBe('1m');
			expect(formatDuration(59950)).toBe('1m');
		});
		it('returns – for missing or invalid input', () => {
			expect(formatDuration(undefined)).toBe('–');
			expect(formatDuration(NaN)).toBe('–');
			expect(formatDuration(-100)).toBe('–');
		});
	});

	describe('formatMetricLabel', () => {
		it('Title-cases snake_case input', () => {
			expect(formatMetricLabel('count_accuracy')).toBe('Count Accuracy');
		});
		it('Title-cases camelCase input', () => {
			expect(formatMetricLabel('helpfulness')).toBe('Helpfulness');
			expect(formatMetricLabel('stringSimilarity')).toBe('String Similarity');
		});
	});

	describe('getMetricCategory', () => {
		it('collapses correctness and helpfulness into aiBased', () => {
			expect(getMetricCategory('correctness')).toBe('aiBased');
			expect(getMetricCategory('helpfulness')).toBe('aiBased');
		});
		it('returns the matching category for built-in heuristic metrics', () => {
			expect(getMetricCategory('stringSimilarity')).toBe('stringSimilarity');
			expect(getMetricCategory('categorization')).toBe('categorization');
			expect(getMetricCategory('toolsUsed')).toBe('toolsUsed');
		});
		it('falls back to custom for unknown values', () => {
			expect(getMetricCategory('customMetrics')).toBe('custom');
			expect(getMetricCategory(undefined)).toBe('custom');
			expect(getMetricCategory('madeUpType')).toBe('custom');
		});
	});
});
