import { NodeConnectionTypes, type IPinData, type IRunData } from 'n8n-workflow';

import { createNodeData, toITaskData } from './helpers';
import { getIncomingData, getIncomingDataForConnection } from '../get-incoming-data';

describe('getIncomingData', () => {
	test('returns null, instead of throwing, when the run data lacks the requested connection type', () => {
		const runData: IRunData = {
			'Basic Node': [toITaskData([{ data: { value: 1 } }])],
		};

		expect(() =>
			getIncomingData(runData, 'Basic Node', 0, NodeConnectionTypes.AiTool, 0),
		).not.toThrow();
		expect(getIncomingData(runData, 'Basic Node', 0, NodeConnectionTypes.AiTool, 0)).toBeNull();
	});
});

describe('getIncomingDataForConnection', () => {
	const source = createNodeData({ name: 'source' });
	const item = { json: { value: 1 } };
	const runItem = { json: { value: 2 } };
	const main = NodeConnectionTypes.Main;

	test.each<{
		title: string;
		outputIndex: number;
		pinData: IPinData;
		runData: IRunData;
		expected: ReturnType<typeof getIncomingDataForConnection>;
	}>([
		{
			title: 'returns pinned data on the first output',
			outputIndex: 0,
			pinData: { source: [item] },
			runData: {},
			expected: { data: [item], runIndex: 0 },
		},
		{
			title: 'returns no data for other outputs of a pinned node',
			outputIndex: 1,
			pinData: { source: [item] },
			runData: { source: [toITaskData([{ data: { value: 2 }, outputIndex: 1 }])] },
			expected: undefined,
		},
		{
			title: 'returns no data for a node pinned with no items',
			outputIndex: 0,
			pinData: { source: [] },
			runData: {},
			expected: undefined,
		},
		{
			title: 'prefers pinned data to run data',
			outputIndex: 0,
			pinData: { source: [item] },
			runData: { source: [toITaskData([{ data: { value: 2 } }])] },
			expected: { data: [item], runIndex: 0 },
		},
		{
			title: 'returns the first run that has items on the output',
			outputIndex: 0,
			pinData: {},
			runData: {
				source: [
					{ ...toITaskData([]), data: { main: [[]] } },
					toITaskData([{ data: { value: 2 } }]),
				],
			},
			expected: { data: [runItem], runIndex: 1 },
		},
		{
			title: 'returns no data for an output without items',
			outputIndex: 1,
			pinData: {},
			runData: { source: [{ ...toITaskData([]), data: { main: [[runItem], []] } }] },
			expected: undefined,
		},
	])('$title', ({ outputIndex, pinData, runData, expected }) => {
		expect(
			getIncomingDataForConnection({ from: source, type: main, outputIndex }, runData, pinData),
		).toEqual(expected);
	});
});
