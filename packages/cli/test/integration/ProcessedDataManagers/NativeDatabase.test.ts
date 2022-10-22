import { ICheckProcessedContextData, ICheckProcessedOutput, ProcessedDataManager } from 'n8n-core';
import { INode, Workflow } from 'n8n-workflow';

import * as Helpers from '../../unit/Helpers';
import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

import { getProcessedDataManagers } from '../../../src/ProcessedDataManagers';

let node: INode;
let testDbName: string;
let workflow: Workflow;

jest.mock('../../../src/telemetry');

beforeAll(async () => {
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	node = {
		id: 'uuid-1234',
		parameters: {},
		name: 'test',
		type: 'test.set',
		typeVersion: 1,
		position: [0, 0],
	};

	const nodeTypes = Helpers.NodeTypes();

	workflow = new Workflow({
		id: '1',
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});

	utils.initTestLogger();
	utils.initTestTelemetry();

	const processedDataConfig = {
		availableModes: 'nativeDatabase',
		mode: 'nativeDatabase',
	};
	const processedDataManagers = await getProcessedDataManagers(processedDataConfig);
	await ProcessedDataManager.init(processedDataConfig, processedDataManagers);
});

beforeEach(async () => {
	await testDb.truncate(['ProcessedData'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('ProcessedData: NativeDatabase should record and check data correctly', async () => {
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
		{},
	);

	// No data exists yet so has to be new
	expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

	processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
		['a', 'b'],
		context,
		contextData,
		{},
	);

	// 'a' & 'b' got only checked before, so still has to be new
	expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

	processedData = await ProcessedDataManager.getInstance().checkProcessed(
		['a', 'b', 'c'],
		context,
		contextData,
		{},
	);

	// 'a' & 'b' got recorded before, 'c' never
	expect(processedData).toEqual({ new: ['c'], processed: ['a', 'b'] });

	processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
		['a', 'b', 'c', 'd'],
		context,
		contextData,
		{},
	);

	// 'a' & 'b' got recorded before, 'c' only checked bfeore and 'd' has never been seen
	expect(processedData).toEqual({ new: ['c', 'd'], processed: ['a', 'b'] });

	await ProcessedDataManager.getInstance().removeProcessed(['b', 'd'], context, contextData);

	processedData = await ProcessedDataManager.getInstance().checkProcessed(
		['a', 'b', 'c', 'd'],
		context,
		contextData,
		{},
	);

	// 'b' & 'd' got removed from the database so they should be new, 'a' & 'b' should still be known
	expect(processedData).toEqual({ new: ['b', 'd'], processed: ['a', 'c'] });
});

test('ProcessedData: NativeDatabase different contexts should not interfere with each other', async () => {
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
		{},
	);

	// No data exists yet for context "node" so has to be new
	expect(processedData).toEqual({ new: ['a', 'b'], processed: [] });

	// Add data with context "workflow"
	processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
		['a', 'b', 'c'],
		'workflow',
		contextData,
		{},
	);

	// No data exists yet for context 'worklow' so has to be new
	expect(processedData).toEqual({ new: ['a', 'b', 'c'], processed: [] });

	await ProcessedDataManager.getInstance().removeProcessed(['a'], 'node', contextData);

	processedData = await ProcessedDataManager.getInstance().checkProcessed(
		['a', 'b', 'c'],
		'node',
		contextData,
		{},
	);

	// 'a' got removed for the context 'node' and 'c' never got saved, so only 'b' should be known
	expect(processedData).toEqual({ new: ['a', 'c'], processed: ['b'] });

	await ProcessedDataManager.getInstance().removeProcessed(['b'], 'workflow', contextData);

	processedData = await ProcessedDataManager.getInstance().checkProcessed(
		['a', 'b', 'c', 'd'],
		'workflow',
		contextData,
		{},
	);

	// 'b' got removed for the context 'workflow' and 'd' never got saved for that reason new
	// 'a' and 'c' should should be known
	expect(processedData).toEqual({ new: ['b', 'd'], processed: ['a', 'c'] });
});

test('ProcessedData: NativeDatabase check maxEntries', async () => {
	const contextData: ICheckProcessedContextData = {
		workflow,
		node,
	};

	let processedData: ICheckProcessedOutput;

	processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
		['0', '1', '2', '3'],
		'node',
		contextData,
		{ maxEntries: 5 },
	);

	// All data should be new
	expect(processedData).toEqual({ new: ['0', '1', '2', '3'], processed: [] });

	// Add data with context "workflow"
	processedData = await ProcessedDataManager.getInstance().checkProcessedAndRecord(
		['4', '5', '6'],
		'node',
		contextData,
		{ maxEntries: 5 },
	);

	// All given data should be new
	expect(processedData).toEqual({ new: ['4', '5', '6'], processed: [] });

	// This should not make a difference, removing an item which does not exist
	await ProcessedDataManager.getInstance().removeProcessed(['a'], 'node', contextData);

	processedData = await ProcessedDataManager.getInstance().checkProcessed(
		['0', '1', '2', '3', '4', '5', '6', '7'],
		'node',
		contextData,
		{ maxEntries: 5 },
	);

	// '7' should be new and '0' and '1' also because they got been pruned as max 5 get saved
	expect(processedData).toEqual({ new: ['0', '1', '7'], processed: ['2', '3', '4', '5', '6'] });
});
