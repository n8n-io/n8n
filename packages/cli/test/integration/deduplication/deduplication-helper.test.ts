import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { DataDeduplicationService } from 'n8n-core';
import type {
	ICheckProcessedContextData,
	IDeduplicationOutput,
	INode,
	DeduplicationItemTypes,
} from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { getDataDeduplicationService } from '@/deduplication';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

let workflow: Workflow;

jest.mock('../../../src/telemetry');

const MOCK_NODE_TYPES_DATA = mockNodeTypesData(['set']);
mockInstance(LoadNodesAndCredentials, {
	loaded: {
		nodes: MOCK_NODE_TYPES_DATA,
		credentials: {},
	},
});

const node: INode = {
	id: 'uuid-1234',
	parameters: {},
	name: 'test',
	type: 'test.set',
	typeVersion: 1,
	position: [0, 0],
};

beforeAll(async () => {
	await testDb.init();

	const nodeTypes = mockInstance(NodeTypes);
	const workflowEntityOriginal = await createWorkflow();

	workflow = new Workflow({
		id: workflowEntityOriginal.id,
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});

	const dataDeduplicationService = getDataDeduplicationService();
	await DataDeduplicationService.init(dataDeduplicationService);
});

beforeEach(async () => {
	await testDb.truncate(['ProcessedData']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Deduplication.DeduplicationHelper', () => {
	test('Deduplication (mode: entries): DeduplicationHelper should record and check data correctly', async () => {
		const context = 'node';
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		let processedData: IDeduplicationOutput;

		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b'],
			context,
			contextData,
			{ mode: 'entries' },
		);

		// 'a' & 'b' got only checked before, so still has to be new
		expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c', 'd'],
			context,
			contextData,
			{ mode: 'entries' },
		);

		// 'a' & 'b' got recorded before, 'c' only checked bfeore and 'd' has never been seen
		expect(processedData).toEqual({ new: ['c', 'd'], processed: ['a', 'b'] });

		await DataDeduplicationService.getInstance().removeProcessed(['b', 'd'], context, contextData, {
			mode: 'entries',
		});
	});

	test('Deduplication (mode: entries): DeduplicationHelper different contexts should not interfere with each other', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		let processedData: IDeduplicationOutput;

		// Add data with context "node"
		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b'],
			'node',
			contextData,
			{ mode: 'entries' },
		);

		// No data exists yet for context "node" so has to be new
		expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

		// Add data with context "workflow"
		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);

		// No data exists yet for context 'worklow' so has to be new
		expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });

		await DataDeduplicationService.getInstance().removeProcessed(['a'], 'node', contextData, {
			mode: 'entries',
		});

		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);

		// 'a' got removed for the context 'node' and 'c' never got saved, so only 'b' should be known
		expect(processedData).toEqual({ new: ['a', 'c'], processed: ['b'] });

		await DataDeduplicationService.getInstance().removeProcessed(['b'], 'workflow', contextData, {
			mode: 'entries',
		});

		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c', 'd'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);

		// 'b' got removed for the context 'workflow' and 'd' never got saved for that reason new
		// 'a' and 'c' should should be known
		expect(processedData).toEqual({ new: ['b', 'd'], processed: ['a', 'c'] });
	});

	test('Deduplication (mode: entries): DeduplicationHelper check maxEntries', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		let processedData: IDeduplicationOutput;

		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['0', '1', '2', '3'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);

		// All data should be new
		expect(processedData).toEqual({ new: ['0', '1', '2', '3'], processed: [] });

		// Add data with context "workflow"
		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['4', '5', '6'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);

		// All given data should be new
		expect(processedData).toEqual({ new: ['4', '5', '6'], processed: [] });

		// This should not make a difference, removing an item which does not exist
		await DataDeduplicationService.getInstance().removeProcessed(['a'], 'node', contextData, {
			mode: 'entries',
		});

		processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['0', '1', '2', '3', '4', '5', '6', '7'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);

		// '7' should be new and '0' and '1' also because they got been pruned as max 5 get saved
		expect(processedData).toEqual({ new: ['0', '1', '7'], processed: ['2', '3', '4', '5', '6'] });
	});

	describe('Deduplication (mode: latestIncrementalKey): DeduplicationHelper should record and check data correctly', () => {
		const tests: Array<{
			description: string;
			data: Array<{
				operation: 'checkProcessedAndRecord';
				input: DeduplicationItemTypes[];
				output: IDeduplicationOutput;
			}>;
		}> = [
			{
				description: 'dates',
				data: [
					{
						operation: 'checkProcessedAndRecord',
						input: [new Date('2022-01-02').toISOString(), new Date('2022-01-03').toISOString()],
						output: {
							new: [new Date('2022-01-02').toISOString(), new Date('2022-01-03').toISOString()],
							processed: [],
						},
					},
					{
						operation: 'checkProcessedAndRecord',
						input: [
							new Date('2022-01-02').toISOString(),
							new Date('2022-01-03').toISOString(),
							new Date('2022-01-04').toISOString(),
							new Date('2022-01-05').toISOString(),
						],
						output: {
							new: [new Date('2022-01-04').toISOString(), new Date('2022-01-05').toISOString()],
							processed: [
								new Date('2022-01-02').toISOString(),
								new Date('2022-01-03').toISOString(),
							],
						},
					},
				],
			},
			{
				description: 'numbers',
				data: [
					{
						operation: 'checkProcessedAndRecord',
						input: [2, 3],
						output: { new: [2, 3], processed: [] },
					},
					{
						operation: 'checkProcessedAndRecord',
						input: [2, 3, 4, 5],
						output: { new: [4, 5], processed: [2, 3] },
					},
				],
			},
		];

		for (const testData of tests) {
			test(testData.description, async () => {
				const context = 'node';
				const contextData: ICheckProcessedContextData = {
					workflow,
					node,
				};
				const mode = testData.description === 'dates' ? 'latestDate' : 'latestIncrementalKey';

				let processedData: IDeduplicationOutput;

				for (const data of testData.data) {
					processedData = await DataDeduplicationService.getInstance()[data.operation](
						data.input,
						context,
						contextData,
						{ mode },
					);

					expect(processedData).toEqual(data.output);
				}
			});
		}
	});

	test('removeProcessed should throw error for latest modes', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		await expect(
			DataDeduplicationService.getInstance().removeProcessed(['2022-01-01'], 'node', contextData, {
				mode: 'latestDate',
			}),
		).rejects.toThrow('Removing processed data is not possible in mode "latest"');

		await expect(
			DataDeduplicationService.getInstance().removeProcessed([1], 'node', contextData, {
				mode: 'latestIncrementalKey',
			}),
		).rejects.toThrow('Removing processed data is not possible in mode "latest"');
	});

	test('clearAllProcessedItems should delete all processed items for workflow scope', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
		};

		// First, add some data
		await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);

		// Clear all processed items
		await DataDeduplicationService.getInstance().clearAllProcessedItems('workflow', contextData, {
			mode: 'entries',
		});

		// Check that all items are now considered new
		const processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);

		expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });
	});

	test('clearAllProcessedItems should delete all processed items for node scope', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		// First, add some data
		await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);

		// Clear all processed items
		await DataDeduplicationService.getInstance().clearAllProcessedItems('node', contextData, {
			mode: 'entries',
		});

		// Check that all items are now considered new
		const processedData = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);

		expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });
	});

	test('clearAllProcessedItems should not clear workflow processed items when clearing node scope', async () => {
		const contextDataWorkflow: ICheckProcessedContextData = {
			workflow,
		};

		const contextDataNode: ICheckProcessedContextData = {
			workflow,
			node,
		};

		// Add data for workflow scope
		await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextDataWorkflow,
			{ mode: 'entries' },
		);

		// Add data for node scope
		await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['d', 'e', 'f'],
			'node',
			contextDataNode,
			{ mode: 'entries' },
		);

		// Clear all processed items for node scope
		await DataDeduplicationService.getInstance().clearAllProcessedItems('node', contextDataNode, {
			mode: 'entries',
		});

		// Ensure workflow processed items are still intact
		const processedDataWorkflow =
			await DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['a', 'b', 'c'],
				'workflow',
				contextDataWorkflow,
				{ mode: 'entries' },
			);

		// Workflow items should still be considered processed
		expect(processedDataWorkflow).toEqual({ new: [], processed: ['a', 'b', 'c'] });

		// Ensure node processed items have been cleared
		const processedDataNode = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['d', 'e', 'f'],
			'node',
			contextDataNode,
			{ mode: 'entries' },
		);

		// Node items should be considered new
		expect(processedDataNode).toEqual({ new: ['d', 'e', 'f'], processed: [] });
	});

	test('clearAllProcessedItems should not clear node processed items when clearing workflow scope', async () => {
		const contextDataWorkflow: ICheckProcessedContextData = {
			workflow,
		};

		const contextDataNode: ICheckProcessedContextData = {
			workflow,
			node,
		};

		// Add data for workflow scope
		await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextDataWorkflow,
			{ mode: 'entries' },
		);

		// Add data for node scope
		await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['d', 'e', 'f'],
			'node',
			contextDataNode,
			{ mode: 'entries' },
		);

		// Clear all processed items for workflow scope
		await DataDeduplicationService.getInstance().clearAllProcessedItems(
			'workflow',
			contextDataWorkflow,
			{
				mode: 'entries',
			},
		);

		// Ensure node processed items are still intact
		const processedDataNode = await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['d', 'e', 'f'],
			'node',
			contextDataNode,
			{ mode: 'entries' },
		);

		// Node items should still be considered processed
		expect(processedDataNode).toEqual({ new: [], processed: ['d', 'e', 'f'] });

		// Ensure workflow processed items have been cleared
		const processedDataWorkflow =
			await DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['a', 'b', 'c'],
				'workflow',
				contextDataWorkflow,
				{ mode: 'entries' },
			);

		// Workflow items should be considered new
		expect(processedDataWorkflow).toEqual({ new: ['a', 'b', 'c'], processed: [] });
	});

	test('getProcessedDataCount should return correct count for different modes', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		// Test for 'entries' mode
		await DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);

		const entriesCount = await DataDeduplicationService.getInstance().getProcessedDataCount(
			'node',
			contextData,
			{ mode: 'entries' },
		);

		expect(entriesCount).toBe(3);

		// Test for other modes (should return 0)
		const latestCount = await DataDeduplicationService.getInstance().getProcessedDataCount(
			'node',
			contextData,
			{ mode: 'latestDate' },
		);

		expect(latestCount).toBe(0);
	});
});
