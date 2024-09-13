import { ProcessedDataManager } from 'n8n-core';
import type { ICheckProcessedContextData, INodeTypeData } from 'n8n-workflow';
import type { ICheckProcessedOutput, INode, ProcessedDataItemTypes } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { mockInstance } from '@test/mocking';
import { createWorkflow } from '@test-integration/db/workflows';

import { getProcessedDataManagers } from '../../../src/processed-data-managers';
import * as testDb from '../shared/test-db';

let workflow: Workflow;

jest.mock('../../../src/telemetry');

const MOCK_NODE_TYPES_DATA = mockNodeTypesData(['set']);
mockInstance(LoadNodesAndCredentials, {
	loaded: {
		nodes: MOCK_NODE_TYPES_DATA,
		credentials: {},
	},
});
function mockNodeTypesData(
	nodeNames: string[],
	options?: {
		addTrigger?: boolean;
	},
) {
	return nodeNames.reduce<INodeTypeData>((acc, nodeName) => {
		return (
			(acc[`n8n-nodes-base.${nodeName}`] = {
				sourcePath: '',
				type: {
					description: {
						displayName: nodeName,
						name: nodeName,
						group: [],
						description: '',
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
					},
					trigger: options?.addTrigger ? async () => undefined : undefined,
				},
			}),
			acc
		);
	}, {});
}
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

	const node: INode = {
		id: 'uuid-1234',
		parameters: {},
		name: 'test',
		type: 'test.set',
		typeVersion: 1,
		position: [0, 0],
	};

	const nodeTypes = mockInstance(NodeTypes);
	const workflowEntityOriginal = await createWorkflow();

	workflow = new Workflow({
		id: workflowEntityOriginal.id,
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});

	const processedDataConfig = {
		availableModes: 'nativeDatabase',
		mode: 'nativeDatabase',
	};
	const processedDataManagers = await getProcessedDataManagers(processedDataConfig);
	await ProcessedDataManager.init(processedDataConfig, processedDataManagers);
});

beforeEach(async () => {
	await testDb.truncate(['ProcessedData']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('ProcessedDataManagers.NativeDatabase', () => {
	test('ProcessedData (mode: entries): NativeDatabase should record and check data correctly', async () => {
		const context = 'node';
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		let processedData: ICheckProcessedOutput;

		processedData = await ProcessedDataManager.getInstance().checkProcessed(
			['a', 'b'],
			context,
			contextData,
			{ mode: 'entries' },
		);

		// No data exists yet so has to be new
		expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

		processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
			['a', 'b'],
			context,
			contextData,
			{ mode: 'entries' },
		);

		// 'a' & 'b' got only checked before, so still has to be new
		expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

		processedData = await ProcessedDataManager.getInstance().checkProcessed(
			['a', 'b', 'c'],
			context,
			contextData,
			{ mode: 'entries' },
		);

		// 'a' & 'b' got recorded before, 'c' never
		expect(processedData).toEqual({ new: ['c'], processed: ['a', 'b'] });

		processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c', 'd'],
			context,
			contextData,
			{ mode: 'entries' },
		);

		// 'a' & 'b' got recorded before, 'c' only checked bfeore and 'd' has never been seen
		expect(processedData).toEqual({ new: ['c', 'd'], processed: ['a', 'b'] });

		await ProcessedDataManager.getInstance().removeProcessed(['b', 'd'], context, contextData, {
			mode: 'entries',
		});

		processedData = await ProcessedDataManager.getInstance().checkProcessed(
			['a', 'b', 'c', 'd'],
			context,
			contextData,
			{ mode: 'entries' },
		);

		// 'b' & 'd' got removed from the database so they should be new, 'a' & 'b' should still be known
		expect(processedData).toEqual({ new: ['b', 'd'], processed: ['a', 'c'] });
	});

	test('ProcessedData (mode: entries): NativeDatabase different contexts should not interfere with each other', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		let processedData: ICheckProcessedOutput;

		// Add data with context "node"
		processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
			['a', 'b'],
			'node',
			contextData,
			{ mode: 'entries' },
		);

		// No data exists yet for context "node" so has to be new
		expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

		// Add data with context "workflow"
		processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
			['a', 'b', 'c'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);

		// No data exists yet for context 'worklow' so has to be new
		expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });

		await ProcessedDataManager.getInstance().removeProcessed(['a'], 'node', contextData, {
			mode: 'entries',
		});

		processedData = await ProcessedDataManager.getInstance().checkProcessed(
			['a', 'b', 'c'],
			'node',
			contextData,
			{ mode: 'entries' },
		);

		// 'a' got removed for the context 'node' and 'c' never got saved, so only 'b' should be known
		expect(processedData).toEqual({ new: ['a', 'c'], processed: ['b'] });

		await ProcessedDataManager.getInstance().removeProcessed(['b'], 'workflow', contextData, {
			mode: 'entries',
		});

		processedData = await ProcessedDataManager.getInstance().checkProcessed(
			['a', 'b', 'c', 'd'],
			'workflow',
			contextData,
			{ mode: 'entries' },
		);

		// 'b' got removed for the context 'workflow' and 'd' never got saved for that reason new
		// 'a' and 'c' should should be known
		expect(processedData).toEqual({ new: ['b', 'd'], processed: ['a', 'c'] });
	});

	test('ProcessedData (mode: entries): NativeDatabase check maxEntries', async () => {
		const contextData: ICheckProcessedContextData = {
			workflow,
			node,
		};

		let processedData: ICheckProcessedOutput;

		processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
			['0', '1', '2', '3'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);

		// All data should be new
		expect(processedData).toEqual({ new: ['0', '1', '2', '3'], processed: [] });

		// Add data with context "workflow"
		processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
			['4', '5', '6'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);

		// All given data should be new
		expect(processedData).toEqual({ new: ['4', '5', '6'], processed: [] });

		// This should not make a difference, removing an item which does not exist
		await ProcessedDataManager.getInstance().removeProcessed(['a'], 'node', contextData, {
			mode: 'entries',
		});

		processedData = await ProcessedDataManager.getInstance().checkProcessed(
			['0', '1', '2', '3', '4', '5', '6', '7'],
			'node',
			contextData,
			{ mode: 'entries', maxEntries: 5 },
		);

		// '7' should be new and '0' and '1' also because they got been pruned as max 5 get saved
		expect(processedData).toEqual({ new: ['0', '1', '7'], processed: ['2', '3', '4', '5', '6'] });
	});

	describe('ProcessedData (mode: latestIncrementalKey): NativeDatabase should record and check data correctly', () => {
		const tests: Array<{
			description: string;
			data: Array<{
				operation: 'checkProcessed' | 'checkProcessedAndRecord';
				input: ProcessedDataItemTypes[];
				output: ICheckProcessedOutput;
			}>;
		}> = [
			{
				description: 'dates',
				data: [
					{
						operation: 'checkProcessed',
						input: [new Date('2022-01-02').toISOString(), new Date('2022-01-03').toISOString()],
						output: {
							new: [new Date('2022-01-02').toISOString(), new Date('2022-01-03').toISOString()],
							processed: [],
						},
					},
					{
						operation: 'checkProcessedAndRecord',
						input: [new Date('2022-01-02').toISOString(), new Date('2022-01-03').toISOString()],
						output: {
							new: [new Date('2022-01-02').toISOString(), new Date('2022-01-03').toISOString()],
							processed: [],
						},
					},
					{
						operation: 'checkProcessed',
						input: [
							new Date('2022-01-02').toISOString(),
							new Date('2022-01-03').toISOString(),
							new Date('2022-01-04').toISOString(),
						],
						output: {
							new: [new Date('2022-01-04').toISOString()],
							processed: [
								new Date('2022-01-02').toISOString(),
								new Date('2022-01-03').toISOString(),
							],
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
					{
						operation: 'checkProcessed',
						input: [
							new Date('2022-01-01').toISOString(),
							new Date('2022-01-02').toISOString(),
							new Date('2022-01-03').toISOString(),
							new Date('2022-01-04').toISOString(),
							new Date('2022-01-06').toISOString(),
							new Date('2022-01-07').toISOString(),
						],
						output: {
							new: [new Date('2022-01-06').toISOString(), new Date('2022-01-07').toISOString()],
							processed: [
								new Date('2022-01-01').toISOString(),
								new Date('2022-01-02').toISOString(),
								new Date('2022-01-03').toISOString(),
								new Date('2022-01-04').toISOString(),
							],
						},
					},
				],
			},
			{
				description: 'numbers',
				data: [
					{
						operation: 'checkProcessed',
						input: [2, 3],
						output: { new: [2, 3], processed: [] },
					},
					{
						operation: 'checkProcessedAndRecord',
						input: [2, 3],
						output: { new: [2, 3], processed: [] },
					},
					{
						operation: 'checkProcessed',
						input: [2, 3, 4],
						output: { new: [4], processed: [2, 3] },
					},
					{
						operation: 'checkProcessedAndRecord',
						input: [2, 3, 4, 5],
						output: { new: [4, 5], processed: [2, 3] },
					},
					{
						operation: 'checkProcessed',
						input: [1, 2, 3, 4, 6, 7],
						output: { new: [6, 7], processed: [1, 2, 3, 4] },
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

				let processedData: ICheckProcessedOutput;

				for (const data of testData.data) {
					processedData = await ProcessedDataManager.getInstance()[data.operation](
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
});
