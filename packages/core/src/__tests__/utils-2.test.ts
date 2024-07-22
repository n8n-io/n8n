import { recreateNodeExecutionStack } from '@/utils-2';
import { createNodeData, defaultWorkflowParameter, toITaskData } from './helpers';
import { DirectedGraph, findSubgraph2, StartNodeData } from '@/utils';
import type { IPinData, IRunData } from 'n8n-workflow';

// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests please update the diagrams as well.
//
// Map
// 0  means the output has no data.
// 1  means the output has data.
// ►► denotes the node that the user wants to execute to.
// XX denotes that the node is disabled

describe('recreateNodeExecutionStack', () => {
	//                  ►►
	//  ┌───────┐       ┌────┐
	//  │Trigger│1─────►│Node│
	//  └───────┘       └────┘
	test('simple', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections({ from: trigger, to: node });

		const workflow = findSubgraph2(graph, node, trigger).toWorkflow({
			...defaultWorkflowParameter,
		});
		const startNodes: StartNodeData[] = [
			{
				node: node,
				sourceData: {
					previousNode: trigger,
					previousNodeRun: 0,
					previousNodeOutput: 0,
				},
			},
		];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinData = {};

		//
		// ACT
		//
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(workflow, startNodes, node.name, runData, pinData);

		//
		// ASSERT
		//
		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node: {
					disabled: false,
					id: 'uuid-1234',
					name: 'node',
					parameters: {},
					position: [100, 100],
					type: 'test.set',
					typeVersion: 1,
				},
				source: { main: [{ previousNode: 'trigger', previousNodeOutput: 0, previousNodeRun: 0 }] },
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

	//                  ►►
	//  ┌───────┐       ┌────┐
	//  │Trigger│0─────►│Node│
	//  └───────┘       └────┘
	test('simple', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const workflow = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections({ from: trigger, to: node })
			.toWorkflow({ ...defaultWorkflowParameter });
		const startNodes: StartNodeData[] = [{ node: trigger }];
		const runData: IRunData = {};
		const pinData: IPinData = {};

		//
		// ACT
		//
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(workflow, startNodes, node.name, runData, pinData);

		//
		// ASSERT
		//
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: {} }]] },
				node: {
					disabled: false,
					id: 'uuid-1234',
					name: 'trigger',
					parameters: {},
					position: [100, 100],
					type: 'test.set',
					typeVersion: 1,
				},
				source: null,
			},
		]);

		expect(waitingExecution).toEqual({ node: { '0': { main: [null] } } });
		expect(waitingExecutionSource).toEqual({ node: { '0': { main: [null] } } });
	});

	//  PD              ►►
	//  ┌───────┐       ┌────┐
	//  │Trigger│1─────►│Node│
	//  └───────┘       └────┘
	test('pinned data', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const workflow = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections({ from: trigger, to: node })
			.toWorkflow({ ...defaultWorkflowParameter });
		const startNodes: StartNodeData[] = [
			{
				node,
				sourceData: { previousNode: trigger, previousNodeRun: 0, previousNodeOutput: 0 },
			},
		];
		const runData: IRunData = {};
		const pinData: IPinData = {
			[trigger.name]: [{ json: { value: 1 } }],
		};

		//
		// ACT
		//
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(workflow, startNodes, node.name, runData, pinData);

		//
		// ASSERT
		//
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node: {
					disabled: false,
					id: 'uuid-1234',
					name: 'node',
					parameters: {},
					position: [100, 100],
					type: 'test.set',
					typeVersion: 1,
				},
				source: {
					main: [{ previousNode: trigger.name, previousNodeRun: 0, previousNodeOutput: 0 }],
				},
			},
		]);

		expect(waitingExecution).toEqual({ node: { '0': { main: [null] } } });
		expect(waitingExecutionSource).toEqual({ node: { '0': { main: [null] } } });
	});

	//                 XX            ►►
	//  ┌───────┐      ┌─────┐       ┌─────┐
	//  │Trigger│1─┬──►│Node1│──┬───►│Node3│
	//  └───────┘  │   └─────┘  │    └─────┘
	//             │            │
	//             │   ┌─────┐  │
	//             └──►│Node2│1─┘
	//                 └─────┘
	test('disabled nodes', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1', disabled: true });
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

		const workflow = findSubgraph2(graph, node3, trigger).toWorkflow({
			...defaultWorkflowParameter,
		});
		const startNodes: StartNodeData[] = [
			{
				node: node3,
				sourceData: {
					previousNode: trigger,
					previousNodeRun: 0,
					previousNodeOutput: 0,
				},
			},
			{
				node: node3,
				sourceData: {
					previousNode: node2,
					previousNodeRun: 0,
					previousNodeOutput: 0,
				},
			},
		];
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 1 } }])],
			[node3.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinData = {};

		//
		// ACT
		//
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(workflow, startNodes, node2.name, runData, pinData);

		//
		// ASSERT
		//

		expect(nodeExecutionStack).toEqual([
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node: {
					disabled: false,
					id: 'uuid-1234',
					name: 'node3',
					parameters: {},
					position: [100, 100],
					type: 'test.set',
					typeVersion: 1,
				},
				source: { main: [{ previousNode: 'trigger', previousNodeOutput: 0, previousNodeRun: 0 }] },
			},
			{
				data: { main: [[{ json: { value: 1 } }]] },
				node: {
					disabled: false,
					id: 'uuid-1234',
					name: 'node3',
					parameters: {},
					position: [100, 100],
					type: 'test.set',
					typeVersion: 1,
				},
				source: { main: [{ previousNode: 'node2', previousNodeOutput: 0, previousNodeRun: 0 }] },
			},
		]);

		expect(waitingExecution).toEqual({
			node2: { '0': { main: [[{ json: { value: 1 } }], [{ json: { value: 1 } }]] } },
		});
		expect(waitingExecutionSource).toEqual({
			node2: {
				'0': {
					main: [
						{ previousNode: 'trigger', previousNodeOutput: undefined, previousNodeRun: undefined },
						{ previousNode: 'trigger', previousNodeOutput: undefined, previousNodeRun: undefined },
					],
				},
			},
		});
	});
});
