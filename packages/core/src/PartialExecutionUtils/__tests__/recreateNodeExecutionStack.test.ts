// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// ►► denotes the node that the user wants to execute to
// XX denotes that the node is disabled
// PD denotes that the node has pinned data

import {
	addWaitingExecution,
	addWaitingExecutionSource,
	recreateNodeExecutionStack,
} from '@/PartialExecutionUtils/recreateNodeExecutionStack';
import {
	INodeExecutionData,
	ISourceData,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	NodeConnectionType,
	type IPinData,
	type IRunData,
} from 'n8n-workflow';
import { AssertionError } from 'assert';
import { DirectedGraph } from '../DirectedGraph';
import { findSubgraph } from '../findSubgraph';
import { createNodeData, toITaskData } from './helpers';

describe('recreateNodeExecutionStack', () => {
	//                   ►►
	//  ┌───────┐1      ┌────┐
	//  │Trigger├──────►│Node│
	//  └───────┘       └────┘
	test('all nodes except destination node have data', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections({ from: trigger, to: node });

		const workflow = findSubgraph(graph, node, trigger);
		const startNodes = [node];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinData = {};

		// ACT
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(workflow, startNodes, runData, pinData);

		// ASSERT
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node,
				source: {
					main: [
						{
							// TODO: not part of ISourceDate, but maybe it should be?
							//currentNodeInput: 0,
							previousNode: 'trigger',
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			},
		]);

		expect(waitingExecution).toEqual({ node: { '0': { main: [[{ json: { value: 1 } }]] } } });
		expect(waitingExecutionSource).toEqual({
			node: {
				'0': {
					main: [
						{ previousNode: 'trigger', previousNodeOutput: undefined, previousNodeRun: undefined },
					],
				},
			},
		});
	});

	//                   ►►
	//  ┌───────┐0      ┌────┐
	//  │Trigger├──────►│Node│
	//  └───────┘       └────┘
	test('no nodes have data', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const workflow = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections({ from: trigger, to: node });
		const startNodes = [trigger];
		const runData: IRunData = {};
		const pinData: IPinData = {};

		// ACT
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(workflow, startNodes, runData, pinData);

		// ASSERT
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: {} }]] },
				node: trigger,
				source: null,
			},
		]);

		expect(waitingExecution).toEqual({ node: { '0': { main: [null] } } });
		expect(waitingExecutionSource).toEqual({ node: { '0': { main: [null] } } });
	});

	//  PinData          ►►
	//  ┌───────┐1      ┌────┐
	//  │Trigger├──────►│Node│
	//  └───────┘       └────┘
	test('node before destination node has pinned data', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const workflow = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections({ from: trigger, to: node });
		const startNodes = [node];
		const runData: IRunData = {};
		const pinData: IPinData = {
			[trigger.name]: [{ json: { value: 1 } }],
		};

		// ACT
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(workflow, startNodes, runData, pinData);

		// ASSERT
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node,
				source: {
					main: [
						{
							// TODO: not part of ISourceDate, but maybe it should be?
							//currentNodeInput: 0,
							previousNode: trigger.name,
							previousNodeRun: 0,
							previousNodeOutput: 0,
						},
					],
				},
			},
		]);

		expect(waitingExecution).toEqual({ node: { '0': { main: [null] } } });
		expect(waitingExecutionSource).toEqual({ node: { '0': { main: [null] } } });
	});

	//                  XX            ►►
	//  ┌───────┐1     ┌─────┐       ┌─────┐
	//  │Trigger├─────►│Node1├──────►│Node2│
	//  └───────┘      └─────┘       └─────┘
	test('throws if a disabled node is found', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1', disabled: true });
		const node2 = createNodeData({ name: 'node2' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2)
			.addConnections({ from: trigger, to: node1 }, { from: node1, to: node2 });

		const startNodes = [node2];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinData = {};

		// ACT & ASSERT
		expect(() => recreateNodeExecutionStack(graph, startNodes, runData, pinData)).toThrowError(
			AssertionError,
		);
	});

	//                                ►►
	//  ┌───────┐1     ┌─────┐1      ┌─────┐
	//  │Trigger├──┬──►│Node1├──┬───►│Node3│
	//  └───────┘  │   └─────┘  │    └─────┘
	//             │            │
	//             │   ┌─────┐1 │
	//             └──►│Node2├──┘
	//                 └─────┘
	test('multiple incoming connections', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const node3 = createNodeData({ name: 'node3' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2, node3)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: trigger, to: node2 },
				{ from: node1, to: node3 },
				{ from: node2, to: node3 },
			);

		const startNodes = [node3];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinData = {};

		// ACT
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(graph, startNodes, runData, pinData);

		// ASSERT
		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node: node3,
				source: {
					main: [
						{
							// TODO: not part of ISourceDate, but maybe it should be?
							//currentNodeInput: 0,
							previousNode: 'node1',
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			},
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node: node3,
				source: {
					main: [
						{
							// TODO: not part of ISourceDate, but maybe it should be?
							//currentNodeInput: 0,
							previousNode: 'node2',
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			},
		]);

		expect(waitingExecution).toEqual({
			node3: { '0': { main: [[{ json: { value: 1 } }], [{ json: { value: 1 } }]] } },
		});
		expect(waitingExecutionSource).toEqual({
			node3: {
				'0': {
					main: [
						{ previousNode: 'node1', previousNodeOutput: undefined, previousNodeRun: undefined },
						{ previousNode: 'node2', previousNodeOutput: undefined, previousNodeRun: undefined },
					],
				},
			},
		});
	});

	//                ┌─────┐1       ►►
	//             ┌─►│node1├───┐   ┌─────┐
	//  ┌───────┐1 │  └─────┘   └──►│     │
	//  │Trigger├──┤                │node3│
	//  └───────┘  │  ┌─────┐1  ┌──►│     │
	//             └─►│node2├───┘   └─────┘
	//                └─────┘
	test('multiple inputs', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const node3 = createNodeData({ name: 'node3' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2, node3)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: trigger, to: node2 },
				{ from: node1, to: node3, inputIndex: 0 },
				{ from: node2, to: node3, inputIndex: 1 },
			);
		const startNodes = [node3];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinData: IPinData = {
			[trigger.name]: [{ json: { value: 1 } }],
		};

		// ACT
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(graph, startNodes, runData, pinData);

		// ASSERT
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack[0]).toEqual({
			data: { main: [[{ json: { value: 1 } }], [{ json: { value: 1 } }]] },
			node: node3,
			source: {
				main: [
					{ previousNode: 'node1', previousNodeOutput: 0, previousNodeRun: 0 },
					{ previousNode: 'node2', previousNodeOutput: 0, previousNodeRun: 0 },
				],
			},
		});

		expect(waitingExecution).toEqual({
			node3: {
				'0': {
					main: [[{ json: { value: 1 } }]],
				},
			},
		});
		expect(waitingExecutionSource).toEqual({
			node3: {
				'0': {
					main: [
						{ previousNode: 'node1', previousNodeOutput: undefined, previousNodeRun: undefined },
						{ previousNode: 'node2', previousNodeOutput: 1, previousNodeRun: undefined },
					],
				},
			},
		});
	});

	//              ┌─────┐1      ►►
	//           ┌─►│Node1┼──┐   ┌─────┐
	// ┌───────┐1│  └─────┘  └──►│     │
	// │Trigger├─┤               │Node3│
	// └───────┘ │  ┌─────┐0 ┌──►│     │
	//           └─►│Node2├──┘   └─────┘
	//              └─────┘
	test('foo', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const node3 = createNodeData({ name: 'node3' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2, node3)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: trigger, to: node2 },
				{ from: node1, to: node3, inputIndex: 0 },
				{ from: node2, to: node3, inputIndex: 1 },
			);
		const startNodes = [node2, node3];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { nodeName: 'trigger' } }])],
			[node1.name]: [toITaskData([{ data: { nodeName: 'node1' } }])],
		};
		const pinData: IPinData = {};

		// ACT
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(graph, startNodes, runData, pinData);

		// ASSERT
		// nodeExecutionStack [ { nodeName: 'Set Input 2', sourceName: [ 'When clicking "Execute Workflow"' ] } ]
		// waitingExecution { Merge:
		//    { '0': { main: [ [ { json: { test: 123 }, pairedItem: { item: 0 } } ], null ] } } }
		// waitingExecutionSource { Merge:
		//    { '0':
		//       { main:
		//          [ { previousNode: 'Set Input 1',
		//              previousNodeOutput: undefined,
		//              previousNodeRun: undefined },
		//            null ] } } }
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack[0]).toEqual({
			node: node2,
			data: { main: [[{ json: { nodeName: 'trigger' } }]] },
			source: {
				main: [{ previousNode: 'trigger', previousNodeOutput: 0, previousNodeRun: 0 }],
			},
		});

		expect(waitingExecution).toEqual({
			node3: {
				'0': {
					main: [[{ json: { nodeName: 'node1' } }], null],
				},
			},
		});
		expect(waitingExecutionSource).toEqual({
			node3: {
				'0': {
					main: [
						{
							previousNode: 'node1',
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
						null,
					],
				},
			},
		});
	});

	//              ┌─────┐0      ►►
	//           ┌─►│Node1┼──┐   ┌─────┐
	// ┌───────┐1│  └─────┘  └──►│     │
	// │Trigger├─┤               │Node3│
	// └───────┘ │  ┌─────┐1 ┌──►│     │
	//           └─►│Node2├──┘   └─────┘
	//              └─────┘
	test('foo2', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const node3 = createNodeData({ name: 'node3' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2, node3)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: trigger, to: node2 },
				{ from: node1, to: node3, inputIndex: 0 },
				{ from: node2, to: node3, inputIndex: 1 },
			);
		const startNodes = [node2, node3];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { nodeName: 'trigger' } }])],
			[node2.name]: [toITaskData([{ data: { nodeName: 'node2' } }])],
		};
		const pinData: IPinData = {};

		// ACT
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(graph, startNodes, runData, pinData);

		// ASSERT
		// nodeExecutionStack [ { nodeName: 'Set Input 2', sourceName: [ 'When clicking "Execute Workflow"' ] } ]
		// waitingExecution { Merge:
		//    { '0': { main: [ [ { json: { test: 123 }, pairedItem: { item: 0 } } ], null ] } } }
		// waitingExecutionSource { Merge:
		//    { '0':
		//       { main:
		//          [ { previousNode: 'Set Input 1',
		//              previousNodeOutput: undefined,
		//              previousNodeRun: undefined },
		//            null ] } } }
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack[0]).toEqual({
			node: node2,
			data: { main: [[{ json: { nodeName: 'trigger' } }]] },
			source: {
				main: [{ previousNode: 'trigger', previousNodeOutput: 0, previousNodeRun: 0 }],
			},
		});

		expect(waitingExecution).toEqual({
			node3: {
				'0': {
					main: [null, [{ json: { nodeName: 'node2' } }]],
				},
			},
		});
		expect(waitingExecutionSource).toEqual({
			node3: {
				'0': {
					main: [
						null,
						{
							previousNode: 'node2',
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			},
		});
	});
});

describe('addWaitingExecution', () => {
	test('allow adding data partially', () => {
		const waitingExecution: IWaitingForExecution = {};
		const nodeName1 = 'node 1';
		const nodeName2 = 'node 2';
		const executionData: INodeExecutionData[] = [{ json: { item: 1 } }, { json: { item: 2 } }];

		// adding the data for the second input index first
		{
			addWaitingExecution(
				waitingExecution,
				nodeName1,
				1, // runIndex
				NodeConnectionType.Main,
				1, // inputIndex
				executionData,
			);
			expect(waitingExecution).toEqual({
				[nodeName1]: {
					// runIndex
					1: {
						[NodeConnectionType.Main]: [undefined, executionData],
					},
				},
			});
		}

		// adding the data for the first input
		{
			addWaitingExecution(
				waitingExecution,
				nodeName1,
				1, // runIndex
				NodeConnectionType.Main,
				0, // inputIndex
				executionData,
			);
			expect(waitingExecution).toEqual({
				[nodeName1]: {
					// runIndex
					1: {
						[NodeConnectionType.Main]: [executionData, executionData],
					},
				},
			});
		}

		// adding data for another node connection type
		{
			addWaitingExecution(
				waitingExecution,
				nodeName1,
				1, // runIndex
				NodeConnectionType.AiMemory,
				0, // inputIndex
				executionData,
			);
			expect(waitingExecution).toEqual({
				[nodeName1]: {
					// runIndex
					1: {
						[NodeConnectionType.Main]: [executionData, executionData],
						[NodeConnectionType.AiMemory]: [executionData],
					},
				},
			});
		}

		// adding data for another run
		{
			addWaitingExecution(
				waitingExecution,
				nodeName1,
				0, // runIndex
				NodeConnectionType.AiChain,
				0, // inputIndex
				executionData,
			);
			expect(waitingExecution).toEqual({
				[nodeName1]: {
					// runIndex
					0: {
						[NodeConnectionType.AiChain]: [executionData],
					},
					1: {
						[NodeConnectionType.Main]: [executionData, executionData],
						[NodeConnectionType.AiMemory]: [executionData],
					},
				},
			});
		}

		// adding data for another node
		{
			addWaitingExecution(
				waitingExecution,
				nodeName2,
				0, // runIndex
				NodeConnectionType.Main,
				2, // inputIndex
				executionData,
			);
			expect(waitingExecution).toEqual({
				[nodeName1]: {
					// runIndex
					0: {
						[NodeConnectionType.AiChain]: [executionData],
					},
					1: {
						[NodeConnectionType.Main]: [executionData, executionData],
						[NodeConnectionType.AiMemory]: [executionData],
					},
				},
				[nodeName2]: {
					// runIndex
					0: {
						[NodeConnectionType.Main]: [undefined, undefined, executionData],
					},
				},
			});
		}

		// allow adding null
		{
			addWaitingExecution(
				waitingExecution,
				nodeName2,
				0, // runIndex
				NodeConnectionType.Main,
				0, // inputIndex
				null,
			);
			expect(waitingExecution).toEqual({
				[nodeName2]: {
					// runIndex
					0: {
						[NodeConnectionType.Main]: [null, undefined, executionData],
					},
				},
				[nodeName1]: {
					// runIndex
					0: {
						[NodeConnectionType.AiChain]: [executionData],
					},
					1: {
						[NodeConnectionType.Main]: [executionData, executionData],
						[NodeConnectionType.AiMemory]: [executionData],
					},
				},
			});
		}
	});
});

describe('addWaitingExecutionSource', () => {
	test('allow adding data partially', () => {
		const waitingExecutionSource: IWaitingForExecutionSource = {};
		const nodeName1 = 'node 1';
		const nodeName2 = 'node 2';
		const sourceData: ISourceData = {
			previousNode: 'node 0',
			previousNodeRun: 0,
			previousNodeOutput: 0,
		};

		// adding the data for the second input index first
		{
			addWaitingExecutionSource(
				waitingExecutionSource,
				nodeName1,
				1, // runIndex
				NodeConnectionType.Main,
				1, // inputIndex
				sourceData,
			);
			expect(waitingExecutionSource).toEqual({
				[nodeName1]: {
					// runIndex
					1: {
						[NodeConnectionType.Main]: [undefined, sourceData],
					},
				},
			});
		}

		// adding the data for the first input
		{
			addWaitingExecutionSource(
				waitingExecutionSource,
				nodeName1,
				1, // runIndex
				NodeConnectionType.Main,
				0, // inputIndex
				sourceData,
			);
			expect(waitingExecutionSource).toEqual({
				[nodeName1]: {
					// runIndex
					1: {
						[NodeConnectionType.Main]: [sourceData, sourceData],
					},
				},
			});
		}

		// adding data for another node connection type
		{
			addWaitingExecutionSource(
				waitingExecutionSource,
				nodeName1,
				1, // runIndex
				NodeConnectionType.AiMemory,
				0, // inputIndex
				sourceData,
			);
			expect(waitingExecutionSource).toEqual({
				[nodeName1]: {
					// runIndex
					1: {
						[NodeConnectionType.Main]: [sourceData, sourceData],
						[NodeConnectionType.AiMemory]: [sourceData],
					},
				},
			});
		}

		// adding data for another run
		{
			addWaitingExecutionSource(
				waitingExecutionSource,
				nodeName1,
				0, // runIndex
				NodeConnectionType.AiChain,
				0, // inputIndex
				sourceData,
			);
			expect(waitingExecutionSource).toEqual({
				[nodeName1]: {
					// runIndex
					0: {
						[NodeConnectionType.AiChain]: [sourceData],
					},
					1: {
						[NodeConnectionType.Main]: [sourceData, sourceData],
						[NodeConnectionType.AiMemory]: [sourceData],
					},
				},
			});
		}

		// adding data for another node
		{
			addWaitingExecutionSource(
				waitingExecutionSource,
				nodeName2,
				0, // runIndex
				NodeConnectionType.Main,
				2, // inputIndex
				sourceData,
			);
			expect(waitingExecutionSource).toEqual({
				[nodeName1]: {
					// runIndex
					0: {
						[NodeConnectionType.AiChain]: [sourceData],
					},
					1: {
						[NodeConnectionType.Main]: [sourceData, sourceData],
						[NodeConnectionType.AiMemory]: [sourceData],
					},
				},
				[nodeName2]: {
					// runIndex
					0: {
						[NodeConnectionType.Main]: [undefined, undefined, sourceData],
					},
				},
			});
		}

		// allow adding null
		{
			addWaitingExecutionSource(
				waitingExecutionSource,
				nodeName2,
				0, // runIndex
				NodeConnectionType.Main,
				0, // inputIndex
				null,
			);
			expect(waitingExecutionSource).toEqual({
				[nodeName1]: {
					// runIndex
					0: {
						[NodeConnectionType.AiChain]: [sourceData],
					},
					1: {
						[NodeConnectionType.Main]: [sourceData, sourceData],
						[NodeConnectionType.AiMemory]: [sourceData],
					},
				},
				[nodeName2]: {
					// runIndex
					0: {
						[NodeConnectionType.Main]: [null, undefined, sourceData],
					},
				},
			});
		}
	});
});
