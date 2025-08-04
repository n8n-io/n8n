'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const deduplication_1 = require('@/deduplication');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const node_types_1 = require('@/node-types');
const node_types_data_1 = require('@test-integration/utils/node-types-data');
let workflow;
jest.mock('../../../src/telemetry');
const MOCK_NODE_TYPES_DATA = (0, node_types_data_1.mockNodeTypesData)(['set']);
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials, {
	loaded: {
		nodes: MOCK_NODE_TYPES_DATA,
		credentials: {},
	},
});
const node = {
	id: 'uuid-1234',
	parameters: {},
	name: 'test',
	type: 'test.set',
	typeVersion: 1,
	position: [0, 0],
};
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	const nodeTypes = (0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
	const workflowEntityOriginal = await (0, backend_test_utils_1.createWorkflow)();
	workflow = new n8n_workflow_1.Workflow({
		id: workflowEntityOriginal.id,
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});
	const dataDeduplicationService = (0, deduplication_1.getDataDeduplicationService)();
	await n8n_core_1.DataDeduplicationService.init(dataDeduplicationService);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['ProcessedData']);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('Deduplication.DeduplicationHelper', () => {
	test('Deduplication (mode: entries): DeduplicationHelper should record and check data correctly', async () => {
		const context = 'node';
		const contextData = {
			workflow,
			node,
		};
		let processedData;
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b'],
			context,
			contextData,
			{ mode: 'entries' },
		);
		expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c', 'd'],
			context,
			contextData,
			{ mode: 'entries' },
		);
		expect(processedData).toEqual({ new: ['c', 'd'], processed: ['a', 'b'] });
		await n8n_core_1.DataDeduplicationService.getInstance().removeProcessed(
			['b', 'd'],
			context,
			contextData,
			{
				mode: 'entries',
			},
		);
	});
	test('Deduplication (mode: entries): DeduplicationHelper different contexts should not interfere with each other', async () => {
		const contextData = {
			workflow,
			node,
		};
		let processedData;
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b'],
			'node',
			contextData,
			{ mode: 'entries' },
		);
		expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);
		expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });
		await n8n_core_1.DataDeduplicationService.getInstance().removeProcessed(
			['a'],
			'node',
			contextData,
			{
				mode: 'entries',
			},
		);
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);
		expect(processedData).toEqual({ new: ['a', 'c'], processed: ['b'] });
		await n8n_core_1.DataDeduplicationService.getInstance().removeProcessed(
			['b'],
			'workflow',
			contextData,
			{
				mode: 'entries',
			},
		);
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c', 'd'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);
		expect(processedData).toEqual({ new: ['b', 'd'], processed: ['a', 'c'] });
	});
	test('Deduplication (mode: entries): DeduplicationHelper check maxEntries', async () => {
		const contextData = {
			workflow,
			node,
		};
		let processedData;
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['0', '1', '2', '3'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);
		expect(processedData).toEqual({ new: ['0', '1', '2', '3'], processed: [] });
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['4', '5', '6'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);
		expect(processedData).toEqual({ new: ['4', '5', '6'], processed: [] });
		await n8n_core_1.DataDeduplicationService.getInstance().removeProcessed(
			['a'],
			'node',
			contextData,
			{
				mode: 'entries',
			},
		);
		processedData = await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['0', '1', '2', '3', '4', '5', '6', '7'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);
		expect(processedData).toEqual({ new: ['0', '1', '7'], processed: ['2', '3', '4', '5', '6'] });
	});
	describe('Deduplication (mode: latestIncrementalKey): DeduplicationHelper should record and check data correctly', () => {
		const tests = [
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
				const contextData = {
					workflow,
					node,
				};
				const mode = testData.description === 'dates' ? 'latestDate' : 'latestIncrementalKey';
				let processedData;
				for (const data of testData.data) {
					processedData = await n8n_core_1.DataDeduplicationService.getInstance()[data.operation](
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
		const contextData = {
			workflow,
			node,
		};
		await expect(
			n8n_core_1.DataDeduplicationService.getInstance().removeProcessed(
				['2022-01-01'],
				'node',
				contextData,
				{
					mode: 'latestDate',
				},
			),
		).rejects.toThrow('Removing processed data is not possible in mode "latest"');
		await expect(
			n8n_core_1.DataDeduplicationService.getInstance().removeProcessed([1], 'node', contextData, {
				mode: 'latestIncrementalKey',
			}),
		).rejects.toThrow('Removing processed data is not possible in mode "latest"');
	});
	test('clearAllProcessedItems should delete all processed items for workflow scope', async () => {
		const contextData = {
			workflow,
		};
		await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);
		await n8n_core_1.DataDeduplicationService.getInstance().clearAllProcessedItems(
			'workflow',
			contextData,
			{
				mode: 'entries',
			},
		);
		const processedData =
			await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['a', 'b', 'c'],
				'workflow',
				contextData,
				{ mode: 'entries' },
			);
		expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });
	});
	test('clearAllProcessedItems should delete all processed items for node scope', async () => {
		const contextData = {
			workflow,
			node,
		};
		await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);
		await n8n_core_1.DataDeduplicationService.getInstance().clearAllProcessedItems(
			'node',
			contextData,
			{
				mode: 'entries',
			},
		);
		const processedData =
			await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['a', 'b', 'c'],
				'node',
				contextData,
				{ mode: 'entries' },
			);
		expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });
	});
	test('clearAllProcessedItems should not clear workflow processed items when clearing node scope', async () => {
		const contextDataWorkflow = {
			workflow,
		};
		const contextDataNode = {
			workflow,
			node,
		};
		await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextDataWorkflow,
			{ mode: 'entries' },
		);
		await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['d', 'e', 'f'],
			'node',
			contextDataNode,
			{ mode: 'entries' },
		);
		await n8n_core_1.DataDeduplicationService.getInstance().clearAllProcessedItems(
			'node',
			contextDataNode,
			{
				mode: 'entries',
			},
		);
		const processedDataWorkflow =
			await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['a', 'b', 'c'],
				'workflow',
				contextDataWorkflow,
				{ mode: 'entries' },
			);
		expect(processedDataWorkflow).toEqual({ new: [], processed: ['a', 'b', 'c'] });
		const processedDataNode =
			await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['d', 'e', 'f'],
				'node',
				contextDataNode,
				{ mode: 'entries' },
			);
		expect(processedDataNode).toEqual({ new: ['d', 'e', 'f'], processed: [] });
	});
	test('clearAllProcessedItems should not clear node processed items when clearing workflow scope', async () => {
		const contextDataWorkflow = {
			workflow,
		};
		const contextDataNode = {
			workflow,
			node,
		};
		await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextDataWorkflow,
			{ mode: 'entries' },
		);
		await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['d', 'e', 'f'],
			'node',
			contextDataNode,
			{ mode: 'entries' },
		);
		await n8n_core_1.DataDeduplicationService.getInstance().clearAllProcessedItems(
			'workflow',
			contextDataWorkflow,
			{
				mode: 'entries',
			},
		);
		const processedDataNode =
			await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['d', 'e', 'f'],
				'node',
				contextDataNode,
				{ mode: 'entries' },
			);
		expect(processedDataNode).toEqual({ new: [], processed: ['d', 'e', 'f'] });
		const processedDataWorkflow =
			await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
				['a', 'b', 'c'],
				'workflow',
				contextDataWorkflow,
				{ mode: 'entries' },
			);
		expect(processedDataWorkflow).toEqual({ new: ['a', 'b', 'c'], processed: [] });
	});
	test('getProcessedDataCount should return correct count for different modes', async () => {
		const contextData = {
			workflow,
			node,
		};
		await n8n_core_1.DataDeduplicationService.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);
		const entriesCount =
			await n8n_core_1.DataDeduplicationService.getInstance().getProcessedDataCount(
				'node',
				contextData,
				{ mode: 'entries' },
			);
		expect(entriesCount).toBe(3);
		const latestCount =
			await n8n_core_1.DataDeduplicationService.getInstance().getProcessedDataCount(
				'node',
				contextData,
				{ mode: 'latestDate' },
			);
		expect(latestCount).toBe(0);
	});
});
//# sourceMappingURL=deduplication-helper.test.js.map
