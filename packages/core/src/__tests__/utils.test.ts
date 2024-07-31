// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests please update the diagrams as well.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// ►► denotes the node that the user wants to execute to
// XX denotes that the node is disabled
// PD denotes that the node has pinned data

import type { IConnections, INode, IPinData, IRunData } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { DirectedGraph, findStartNodes, findSubgraph2, isDirty } from '../utils';
import { createNodeData, toITaskData, defaultWorkflowParameter } from './helpers';

test('toITaskData', function () {
	expect(toITaskData([{ data: { value: 1 } }])).toEqual({
		executionStatus: 'success',
		executionTime: 0,
		source: [],
		startTime: 0,
		data: {
			main: [[{ json: { value: 1 } }]],
		},
	});

	expect(toITaskData([{ data: { value: 1 }, outputIndex: 1 }])).toEqual({
		executionStatus: 'success',
		executionTime: 0,
		source: [],
		startTime: 0,
		data: {
			main: [null, [{ json: { value: 1 } }]],
		},
	});

	expect(
		toITaskData([
			{ data: { value: 1 }, outputIndex: 1, nodeConnectionType: NodeConnectionType.AiAgent },
		]),
	).toEqual({
		executionStatus: 'success',
		executionTime: 0,
		source: [],
		startTime: 0,
		data: {
			[NodeConnectionType.AiAgent]: [null, [{ json: { value: 1 } }]],
		},
	});

	expect(
		toITaskData([
			{ data: { value: 1 }, outputIndex: 0 },
			{ data: { value: 2 }, outputIndex: 1 },
		]),
	).toEqual({
		executionStatus: 'success',
		executionTime: 0,
		startTime: 0,
		source: [],
		data: {
			main: [
				[
					{
						json: { value: 1 },
					},
				],
				[
					{
						json: { value: 2 },
					},
				],
			],
		},
	});
});

type Connection = {
	from: INode;
	to: INode;
	type?: NodeConnectionType;
	outputIndex?: number;
	inputIndex?: number;
};

function toIConnections(connections: Connection[]): IConnections {
	const result: IConnections = {};

	for (const connection of connections) {
		const type = connection.type ?? NodeConnectionType.Main;
		const outputIndex = connection.outputIndex ?? 0;
		const inputIndex = connection.inputIndex ?? 0;

		result[connection.from.name] = result[connection.from.name] ?? {
			[type]: [],
		};
		const resultConnection = result[connection.from.name];
		resultConnection[type][outputIndex] = resultConnection[type][outputIndex] ?? [];
		const group = resultConnection[type][outputIndex];

		group.push({
			node: connection.to.name,
			type,
			index: inputIndex,
		});
	}

	return result;
}

test('toIConnections', () => {
	const node1 = createNodeData({ name: 'Basic Node 1' });
	const node2 = createNodeData({ name: 'Basic Node 2' });

	expect(
		toIConnections([{ from: node1, to: node2, type: NodeConnectionType.Main, outputIndex: 0 }]),
	).toEqual({
		[node1.name]: {
			// output group
			main: [
				// first output
				[
					// first connection
					{
						node: node2.name,
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
	});
});

//export interface INodeTypes {
//	getByName(nodeType: string): INodeType | IVersionedNodeType;
//	getByNameAndVersion(nodeType: string, version?: number): INodeType;
//	getKnownTypes(): IDataObject;
//}

describe('isDirty', () => {
	test("if the node has pinned data it's not dirty", () => {
		const node = createNodeData({ name: 'Basic Node' });

		const pinData: IPinData = {
			[node.name]: [{ json: { value: 1 } }],
		};

		expect(isDirty(node, undefined, pinData)).toBe(false);
	});

	test("if the node has run data it's not dirty", () => {
		const node = createNodeData({ name: 'Basic Node' });

		const runData: IRunData = {
			[node.name]: [toITaskData([{ data: { value: 1 } }])],
		};

		expect(isDirty(node, runData)).toBe(false);
	});
});

describe('findStartNodes', () => {
	//   ►►
	//  ┌───────┐
	//  │trigger│
	//  └───────┘
	test('finds the start node if there is only a trigger', () => {
		const node = createNodeData({ name: 'Basic Node' });
		const graph = new DirectedGraph().addNode(node);

		const startNodes = findStartNodes(graph, node, node);

		expect(startNodes).toHaveLength(1);
		expect(startNodes).toContainEqual({ node, sourceData: undefined });
	});

	//                 ►►
	//  ┌───────┐     ┌───────────┐
	//  │trigger├────►│destination│
	//  └───────┘     └───────────┘
	test('finds the start node in a simple graph', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const destination = createNodeData({ name: 'destination' });
		const graph = new DirectedGraph()
			.addNodes(trigger, destination)
			.addConnection({ from: trigger, to: destination });

		// if the trigger has no run data
		{
			const startNodes = findStartNodes(graph, trigger, destination);

			expect(startNodes).toHaveLength(1);
			expect(startNodes).toContainEqual({ node: trigger, sourceData: undefined });
		}

		// if the trigger has run data
		{
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			};

			const startNodes = findStartNodes(graph, trigger, destination, runData);

			expect(startNodes).toHaveLength(1);
			expect(startNodes).toContainEqual({
				node: destination,
				sourceData: { previousNode: trigger, previousNodeOutput: 0, previousNodeRun: 0 },
			});
		}
	});

	//  ┌───────┐       ►►
	//  │       │1──┐  ┌────┐
	//  │trigger│   ├─►│node│
	//  │       │1──┘  └────┘
	//  └───────┘
	//  All nodes have run data. `findStartNodes` should return node twice
	//  because it has 2 input connections.
	test('multiple outputs', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections(
				{ from: trigger, to: node, outputIndex: 0, inputIndex: 0 },
				{ from: trigger, to: node, outputIndex: 1, inputIndex: 0 },
			);
		const runData: IRunData = {
			[trigger.name]: [
				toITaskData([
					{ data: { value: 1 }, outputIndex: 0 },
					{ data: { value: 1 }, outputIndex: 1 },
				]),
			],
			[node.name]: [toITaskData([{ data: { value: 1 } }])],
		};

		//
		// ACT
		//
		const startNodes = findStartNodes(graph, trigger, node, runData);

		//
		// ASSERT
		//
		expect(startNodes).toHaveLength(2);
		expect(startNodes).toContainEqual({
			node,
			sourceData: {
				previousNode: trigger,
				previousNodeOutput: 0,
				previousNodeRun: 0,
			},
		});
		expect(startNodes).toContainEqual({
			node,
			sourceData: {
				previousNode: trigger,
				previousNodeOutput: 1,
				previousNodeRun: 0,
			},
		});
	});

	//             ┌─────┐              ┌─────┐          ►►
	//┌───────┐    │     ├────┬────────►│     │         ┌─────┐
	//│trigger├───►│node1│    │         │node2├────┬───►│node4│
	//└───────┘    │     ├────┼────┬───►│     │    │    └─────┘
	//             └─────┘    │    │    └─────┘    │
	//                        │    │               │
	//                        │    │               │
	//                        │    │               │
	//                        │    │    ┌─────┐    │
	//                        │    └───►│     │    │
	//                        │         │node3├────┘
	//                        └────────►│     │
	//                                  └─────┘
	test('complex example with multiple outputs and inputs', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const node3 = createNodeData({ name: 'node3' });
		const node4 = createNodeData({ name: 'node4' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2, node3, node4)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: node1, to: node2, outputIndex: 0, inputIndex: 0 },
				{ from: node1, to: node2, outputIndex: 1, inputIndex: 1 },
				{ from: node1, to: node3, outputIndex: 0, inputIndex: 1 },
				{ from: node1, to: node3, outputIndex: 1, inputIndex: 0 },
				{ from: node2, to: node4 },
				{ from: node3, to: node4 },
			);

		{
			const startNodes = findStartNodes(graph, trigger, node4);
			expect(startNodes).toHaveLength(1);
			// no run data means the trigger is the start node
			expect(startNodes).toContainEqual({ node: trigger, sourceData: undefined });
		}

		{
			// run data for everything
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
				[node1.name]: [toITaskData([{ data: { value: 1 } }])],
				[node2.name]: [toITaskData([{ data: { value: 1 } }])],
				[node3.name]: [toITaskData([{ data: { value: 1 } }])],
				[node4.name]: [toITaskData([{ data: { value: 1 } }])],
			};

			const startNodes = findStartNodes(graph, trigger, node4, runData);
			expect(startNodes).toHaveLength(2);

			expect(startNodes).toContainEqual({
				node: node4,
				sourceData: {
					previousNode: node2,
					previousNodeOutput: 0,
					previousNodeRun: 0,
				},
			});

			expect(startNodes).toContainEqual({
				node: node4,
				sourceData: {
					previousNode: node3,
					previousNodeOutput: 0,
					previousNodeRun: 0,
				},
			});
		}
	});

	//                     ►►
	//  ┌───────┐1        ┌────┐
	//  │       ├────────►│    │
	//  │trigger│         │node│
	//  │       ├────────►│    │
	//  └───────┘0        └────┘
	//  The merge node only gets data on one input, so the it should only be once
	//  in the start nodes
	test('multiple connections with the first one having data', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections(
				{ from: trigger, to: node, inputIndex: 0, outputIndex: 0 },
				{ from: trigger, to: node, inputIndex: 1, outputIndex: 1 },
			);

		const startNodes = findStartNodes(graph, trigger, node, {
			[trigger.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 0 }])],
		});

		expect(startNodes).toHaveLength(1);
		expect(startNodes).toContainEqual({
			node,
			sourceData: {
				previousNode: trigger,
				previousNodeRun: 0,
				previousNodeOutput: 0,
			},
		});
	});

	//                     ►►
	//  ┌───────┐0        ┌────┐
	//  │       ├────────►│    │
	//  │trigger│         │node│
	//  │       ├────────►│    │
	//  └───────┘1        └────┘
	//  The merge node only gets data on one input, so the it should only be once
	//  in the start nodes
	test('multiple connections with the second one having data', () => {
		const ifNode = createNodeData({ name: 'if' });
		const merge = createNodeData({ name: 'merge' });

		const graph = new DirectedGraph()
			.addNodes(ifNode, merge)
			.addConnections(
				{ from: ifNode, to: merge, inputIndex: 0, outputIndex: 0 },
				{ from: ifNode, to: merge, inputIndex: 1, outputIndex: 1 },
			);

		const startNodes = findStartNodes(graph, ifNode, merge, {
			[ifNode.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 1 }])],
		});

		expect(startNodes).toHaveLength(1);
		expect(startNodes).toContainEqual({
			node: merge,
			sourceData: {
				previousNode: ifNode,
				previousNodeRun: 0,
				previousNodeOutput: 1,
			},
		});
	});

	//                     ►►
	//  ┌───────┐1        ┌────┐
	//  │       ├────────►│    │
	//  │trigger│         │node│
	//  │       ├────────►│    │
	//  └───────┘1        └────┘
	//  The merge node gets data on both inputs, so the it should be in the start
	//  nodes twice.
	test('multiple connections with both having data', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections(
				{ from: trigger, to: node, inputIndex: 0, outputIndex: 0 },
				{ from: trigger, to: node, inputIndex: 1, outputIndex: 1 },
			);

		const startNodes = findStartNodes(graph, trigger, node, {
			[trigger.name]: [
				toITaskData([
					{ data: { value: 1 }, outputIndex: 0 },
					{ data: { value: 1 }, outputIndex: 1 },
				]),
			],
		});

		expect(startNodes).toHaveLength(2);
		expect(startNodes).toContainEqual({
			node,
			sourceData: {
				previousNode: trigger,
				previousNodeRun: 0,
				previousNodeOutput: 0,
			},
		});
	});
		expect(startNodes).toContainEqual({
			node: merge,
			sourceData: {
				previousNode: ifNode,
				previousNodeRun: 0,
				previousNodeOutput: 1,
			},
		});
	});

	//                                    ►►
	//  ┌───────┐        ┌─────┐0        ┌─────┐
	//  │       │1       │     ├────────►│     │
	//  │trigger├───────►│node1│         │node2│
	//  │       │        │     ├────────►│     │
	//  └───────┘        └─────┘1        └─────┘
	test('multiple connections with trigger', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: node1, to: node2, outputIndex: 0 },
				{ from: node1, to: node2, outputIndex: 1 },
			);

		const startNodes = findStartNodes(graph, node1, node2, {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			[node1.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 1 }])],
		});

		expect(startNodes).toHaveLength(1);
		expect(startNodes).toContainEqual({
			node: node2,
			sourceData: {
				previousNode: node1,
				previousNodeRun: 0,
				previousNodeOutput: 1,
			},
		});
	});

	//                              ►►
	//┌───────┐1      ┌─────┐1     ┌─────┐
	//│Trigger├───┬──►│Node1├───┬─►│Node2│
	//└───────┘   │   └─────┘   │  └─────┘
	//            │             │
	//            └─────────────┘
	test('terminates when called with graph that contains cycles', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: node1, to: node1 },
				{ from: node1, to: node2 },
			);
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinData: IPinData = {};

		//
		// ACT
		//
		const startNodes = findStartNodes(graph, trigger, node2, runData, pinData);

		//
		// ASSERT
		//
		expect(startNodes).toHaveLength(1);
		expect(startNodes).toContainEqual({
			node: node2,
			sourceData: {
				previousNode: node1,
				previousNodeRun: 0,
				previousNodeOutput: 0,
			},
		});
	});
});

describe('findSubgraph2', () => {
	//                 ►►
	//  ┌───────┐     ┌───────────┐
	//  │trigger├────►│destination│
	//  └───────┘     └───────────┘
	test('simple', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const destination = createNodeData({ name: 'destination' });

		const graph = new DirectedGraph()
			.addNodes(trigger, destination)
			.addConnections({ from: trigger, to: destination });

		const subgraph = findSubgraph2(graph, destination, trigger);

		expect(subgraph).toEqual(graph);
	});

	//                     ►►
	//  ┌───────┐         ┌───────────┐
	//  │       ├────────►│           │
	//  │trigger│         │destination│
	//  │       ├────────►│           │
	//  └───────┘         └───────────┘
	test('multiple connections', () => {
		const ifNode = createNodeData({ name: 'If' });
		const noOp = createNodeData({ name: 'noOp' });

		const graph = new DirectedGraph()
			.addNodes(ifNode, noOp)
			.addConnections(
				{ from: ifNode, to: noOp, outputIndex: 0 },
				{ from: ifNode, to: noOp, outputIndex: 1 },
			);

		const subgraph = findSubgraph2(graph, noOp, ifNode);

		expect(subgraph).toEqual(graph);
	});

	//                     ►►
	//  ┌───────┐         ┌───────────┐
	//  │       ├────────►│           │      ┌────┐
	//  │trigger│         │destination├─────►│node│
	//  │       ├────────►│           │      └────┘
	//  └───────┘         └───────────┘
	test('disregard nodes after destination', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const destination = createNodeData({ name: 'destination' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, destination, node)
			.addConnections({ from: trigger, to: destination }, { from: destination, to: node });

		const subgraph = findSubgraph2(graph, destination, trigger);

		expect(subgraph).toEqual(
			new DirectedGraph()
				.addNodes(trigger, destination)
				.addConnections({ from: trigger, to: destination }),
		);
	});

	//                     XX
	//  ┌───────┐         ┌────────┐       ►►
	//  │       ├────────►│        │      ┌───────────┐
	//  │trigger│         │disabled├─────►│destination│
	//  │       ├────────►│        │      └───────────┘
	//  └───────┘         └────────┘
	test('skip disabled nodes', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const disabled = createNodeData({ name: 'disabled', disabled: true });
		const destination = createNodeData({ name: 'destination' });

		const graph = new DirectedGraph()
			.addNodes(trigger, disabled, destination)
			.addConnections({ from: trigger, to: disabled }, { from: disabled, to: destination });

		const subgraph = findSubgraph2(graph, destination, trigger);

		expect(subgraph).toEqual(
			new DirectedGraph()
				.addNodes(trigger, destination)
				.addConnections({ from: trigger, to: destination }),
		);
	});

	//                                ►►
	//  ┌───────┐       ┌─────┐      ┌─────┐
	//  │Trigger├───┬──►│Node1├───┬─►│Node2│
	//  └───────┘   │   └─────┘   │  └─────┘
	//              │             │
	//              └─────────────┘
	test('terminates when called with graph that contains cycles', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2)
			.addConnections(
				{ from: trigger, to: node1 },
				{ from: node1, to: node1 },
				{ from: node1, to: node2 },
			);

		//
		// ACT
		//
		const subgraph = findSubgraph2(graph, node2, trigger);

		//
		// ASSERT
		//
		expect(subgraph).toEqual(graph);
	});

	//                ►►
	//  ┌───────┐     ┌─────┐
	//  │Trigger├──┬─►│Node1│
	//  └───────┘  │  └─────┘
	//             │
	//  ┌─────┐    │
	//  │Node2├────┘
	//  └─────┘
	test('terminates when called with graph that contains cycles', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, node2)
			.addConnections({ from: trigger, to: node1 }, { from: node2, to: node1 });

		//
		// ACT
		//
		const subgraph = findSubgraph2(graph, node1, trigger);

		//
		// ASSERT
		//
		expect(subgraph).toEqual(
			new DirectedGraph().addNodes(trigger, node1).addConnections({ from: trigger, to: node1 }),
		);
	});

	//                               ►►
	//  ┌───────┐    ┌───────────┐   ┌───────────┐
	//  │Trigger├─┬─►│Destination├──►│AnotherNode├───┐
	//  └───────┘ │  └───────────┘   └───────────┘   │
	//            │                                  │
	//            └──────────────────────────────────┘
	test('terminates if the destination node is part of a cycle', () => {
		//
		// ARRANGE
		//
		const trigger = createNodeData({ name: 'trigger' });
		const destination = createNodeData({ name: 'destination' });
		const anotherNode = createNodeData({ name: 'anotherNode' });
		const graph = new DirectedGraph()
			.addNodes(trigger, destination, anotherNode)
			.addConnections(
				{ from: trigger, to: destination },
				{ from: destination, to: anotherNode },
				{ from: anotherNode, to: destination },
			);

		//
		// ACT
		//
		const subgraph = findSubgraph2(graph, destination, trigger);

		//
		// ASSERT
		//
		expect(subgraph).toEqual(
			new DirectedGraph()
				.addNodes(trigger, destination)
				.addConnections({ from: trigger, to: destination }),
		);
	});
});

describe('DirectedGraph', () => {
	//     ┌─────┐    ┌─────┐   ┌─────┐
	//  ┌─►│node1├───►│node2├──►│node3├─┐
	//  │  └─────┘    └─────┘   └─────┘ │
	//  │                               │
	//  └───────────────────────────────┘
	test('roundtrip', () => {
		const node1 = createNodeData({ name: 'Node1' });
		const node2 = createNodeData({ name: 'Node2' });
		const node3 = createNodeData({ name: 'Node3' });

		const graph = new DirectedGraph()
			.addNodes(node1, node2, node3)
			.addConnections(
				{ from: node1, to: node2 },
				{ from: node2, to: node3 },
				{ from: node3, to: node1 },
			);

		expect(DirectedGraph.fromWorkflow(graph.toWorkflow({ ...defaultWorkflowParameter }))).toEqual(
			graph,
		);
	});

	describe('getChildren', () => {
		//  ┌─────┐       ┌─────┐
		//  │node1├──────►│node2│
		//  └─────┘       └─────┘
		test('simple', () => {
			const from = createNodeData({ name: 'Node1' });
			const to = createNodeData({ name: 'Node2' });
			const graph = new DirectedGraph().addNodes(from, to).addConnections({ from, to });

			const children = graph.getChildren(from);
			expect(children).toHaveLength(1);
			expect(children).toContainEqual({
				from,
				to,
				inputIndex: 0,
				outputIndex: 0,
				type: NodeConnectionType.Main,
			});
		});
		//  ┌─────┐
		//  │     ├────┐  ┌─────┐
		//  │node1│    ├─►│node2│
		//  │     ├────┘  └─────┘
		//  └─────┘
		test('medium', () => {
			const from = createNodeData({ name: 'Node1' });
			const to = createNodeData({ name: 'Node2' });
			const graph = new DirectedGraph()
				.addNodes(from, to)
				.addConnections({ from, to, outputIndex: 0 }, { from, to, outputIndex: 1 });

			const children = graph.getChildren(from);
			expect(children).toHaveLength(2);
			expect(children).toContainEqual({
				from,
				to,
				inputIndex: 0,
				outputIndex: 0,
				type: NodeConnectionType.Main,
			});
			expect(children).toContainEqual({
				from,
				to,
				inputIndex: 0,
				outputIndex: 1,
				type: NodeConnectionType.Main,
			});
		});

		//     ┌─────┐       ┌─────┐
		//  ┌─►│node1├──────►│node2├──┐
		//  │  └─────┘       └─────┘  │
		//  │                         │
		//  └─────────────────────────┘
		test('terminates if the graph has cycles', () => {
			//
			// ARRANGE
			//
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const graph = new DirectedGraph()
				.addNodes(node1, node2)
				.addConnections({ from: node1, to: node2 }, { from: node2, to: node2 });

			//
			// ACT
			//
			const children = graph.getChildren(node1);

			//
			// ASSERT
			//
			expect(children).toHaveLength(2);
			expect(children).toContainEqual({
				from: node1,
				to: node2,
				inputIndex: 0,
				outputIndex: 0,
				type: NodeConnectionType.Main,
			});
			expect(children).toContainEqual({
				from: node2,
				to: node2,
				inputIndex: 0,
				outputIndex: 0,
				type: NodeConnectionType.Main,
			});
		});
	});
});
