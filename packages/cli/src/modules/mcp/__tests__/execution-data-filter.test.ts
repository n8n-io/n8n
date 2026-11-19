import { createEmptyRunExecutionData, type IRunExecutionData } from 'n8n-workflow';

import { filterExecutionData } from '../tools/execution-data-filter';

type ExecutionData = NonNullable<IRunExecutionData['executionData']>;

const secretItems = [
	{ json: { secret: 'DUMMY-SECRET-1' } },
	{ json: { secret: 'DUMMY-SECRET-2' } },
	{ json: { secret: 'DUMMY-SECRET-3' } },
];

/**
 * Mirrors a failed execution: the node that threw stays on the stack together
 * with all of its input items, and the waiting queues carry node-level data too.
 */
function failedExecutionData(): IRunExecutionData {
	const data = createEmptyRunExecutionData();
	data.resultData.runData = {
		Start: [
			{
				startTime: 0,
				executionIndex: 0,
				executionTime: 1,
				source: [],
				data: { main: [[{ json: {} }]] },
			},
		],
	};
	data.executionData = {
		contextData: {},
		metadata: {},
		nodeExecutionStack: [
			{
				node: { name: 'Start' },
				data: { main: [[{ json: { value: 'start' } }]] },
				source: null,
			},
			{
				node: { name: 'Throw error' },
				data: { main: [secretItems] },
				source: null,
			},
		],
		waitingExecution: {
			Start: { 0: { main: [[{ json: { value: 'start' } }]] } },
			'Throw error': { 0: { main: [secretItems] } },
		},
		waitingExecutionSource: {
			Start: { 0: { main: [null] } },
			'Throw error': { 0: { main: [null] } },
		},
	} as unknown as ExecutionData;
	return data;
}

describe('filterExecutionData', () => {
	describe('resultData', () => {
		test('filters runData and pinData by nodeNames', () => {
			const data = failedExecutionData();
			data.resultData.pinData = {
				Start: [{ json: { pinned: 'start' } }],
				'Throw error': [{ json: { pinned: 'error' } }],
			};

			const filtered = filterExecutionData(data, ['Start']);

			expect(Object.keys(filtered.resultData.runData)).toEqual(['Start']);
			expect(Object.keys(filtered.resultData.pinData ?? {})).toEqual(['Start']);
		});

		test('truncates runData items', () => {
			const data = failedExecutionData();
			data.resultData.runData.Start[0].data = { main: [secretItems] };

			const filtered = filterExecutionData(data, undefined, 2);

			expect(filtered.resultData.runData.Start[0].data?.main[0]).toHaveLength(2);
		});
	});

	describe('executionData', () => {
		test('nodeNames drops stack entries for nodes outside the filter', () => {
			const filtered = filterExecutionData(failedExecutionData(), ['Start']);

			expect(filtered.executionData?.nodeExecutionStack.map((entry) => entry.node.name)).toEqual([
				'Start',
			]);
			expect(JSON.stringify(filtered)).not.toContain('DUMMY-SECRET');
		});

		test('truncateData limits items in the stack entries that remain', () => {
			const filtered = filterExecutionData(failedExecutionData(), undefined, 1);

			const stack = filtered.executionData?.nodeExecutionStack ?? [];
			expect(stack).toHaveLength(2);
			expect(stack[1].data.main[0]).toHaveLength(1);
			expect(stack[1].data.main[0]).toEqual([{ json: { secret: 'DUMMY-SECRET-1' } }]);
		});

		test('nodeNames filters waitingExecution and waitingExecutionSource', () => {
			const filtered = filterExecutionData(failedExecutionData(), ['Start']);

			expect(Object.keys(filtered.executionData?.waitingExecution ?? {})).toEqual(['Start']);
			expect(Object.keys(filtered.executionData?.waitingExecutionSource ?? {})).toEqual(['Start']);
			expect(JSON.stringify(filtered)).not.toContain('DUMMY-SECRET');
		});

		test('truncateData limits items in waitingExecution', () => {
			const filtered = filterExecutionData(failedExecutionData(), undefined, 2);

			expect(filtered.executionData?.waitingExecution['Throw error'][0].main[0]).toHaveLength(2);
		});

		test('applies both options together', () => {
			const filtered = filterExecutionData(failedExecutionData(), ['Throw error'], 1);

			expect(Object.keys(filtered.resultData.runData)).toEqual([]);
			expect(filtered.executionData?.nodeExecutionStack.map((entry) => entry.node.name)).toEqual([
				'Throw error',
			]);
			expect(filtered.executionData?.nodeExecutionStack[0].data.main[0]).toHaveLength(1);
			expect(Object.keys(filtered.executionData?.waitingExecution ?? {})).toEqual(['Throw error']);
		});

		test('leaves executionData untouched when no filter is requested', () => {
			const data = failedExecutionData();

			const filtered = filterExecutionData(data);

			expect(filtered.executionData?.nodeExecutionStack).toHaveLength(2);
			expect(filtered.executionData?.nodeExecutionStack[1].data.main[0]).toHaveLength(3);
		});

		test('preserves a null waitingExecutionSource', () => {
			const data = failedExecutionData();
			data.executionData!.waitingExecutionSource = null;

			const filtered = filterExecutionData(data, ['Start']);

			expect(filtered.executionData?.waitingExecutionSource).toBeNull();
		});

		test('does not mutate the source execution data', () => {
			const data = failedExecutionData();

			filterExecutionData(data, ['Start'], 1);

			expect(data.executionData?.nodeExecutionStack).toHaveLength(2);
			expect(data.executionData?.nodeExecutionStack[1].data.main[0]).toHaveLength(3);
			expect(Object.keys(data.executionData?.waitingExecution ?? {})).toEqual([
				'Start',
				'Throw error',
			]);
		});

		test('handles executions without executionData', () => {
			const data = createEmptyRunExecutionData();

			const filtered = filterExecutionData(data, ['Start'], 1);

			expect(filtered.executionData).toBeUndefined();
			expect(filtered.resultData.runData).toEqual({});
		});
	});
});
