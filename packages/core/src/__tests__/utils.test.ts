// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests please update the diagrams as well.
//
// Map
// 0  means the output has no data.
// 1  means the output has data.
// ►► denotes the node that the user wants to execute to.
// XX denotes that the node is disabled
//
// TODO: rename all nodes to generic names, don't use if, merge, etc.

import type { IConnections, INode, IPinData, IRunData } from 'n8n-workflow';
import { NodeConnectionType, Workflow } from 'n8n-workflow';
import { DirectedGraph, findStartNodes, findSubgraph, findSubgraph2, isDirty } from '../utils';
import { createNodeData, toITaskData, nodeTypes, defaultWorkflowParameter } from './helpers';

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
	test('simple', () => {
		const node = createNodeData({ name: 'Basic Node' });

		const graph = new DirectedGraph().addNode(node);

		expect(findStartNodes(graph, node, node)).toStrictEqual([{ node, sourceData: undefined }]);
	});

	test('less simple', () => {
		const node1 = createNodeData({ name: 'Basic Node 1' });
		const node2 = createNodeData({ name: 'Basic Node 2' });

		const graph = new DirectedGraph()
			.addNodes(node1, node2)
			.addConnection({ from: node1, to: node2 });

		expect(findStartNodes(graph, node1, node2)).toStrictEqual([
			{ node: node1, sourceData: undefined },
		]);

		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
		};

		expect(findStartNodes(graph, node1, node2, runData)).toStrictEqual([
			{
				node: node2,
				sourceData: { previousNode: node1, previousNodeOutput: 0, previousNodeRun: 0 },
			},
		]);
	});

	//
	//  ┌────┐
	//  │    │1───┐    ┌────┐
	//  │ if │    ├───►│noOp│
	//  │    │1───┘    └────┘
	//  └────┘
	//
	//  All nodes have run data. `findStartNodes` should return noOp twice
	//  because it has 2 input connections.
	test('multiple outputs', () => {
		const ifNode = createNodeData({ name: 'If' });
		const noOp = createNodeData({ name: 'NoOp' });

		const graph = new DirectedGraph()
			.addNodes(ifNode, noOp)
			.addConnections(
				{ from: ifNode, to: noOp, outputIndex: 0, inputIndex: 0 },
				{ from: ifNode, to: noOp, outputIndex: 1, inputIndex: 0 },
			);

		const runData: IRunData = {
			[ifNode.name]: [
				toITaskData([
					{ data: { value: 1 }, outputIndex: 0 },
					{ data: { value: 1 }, outputIndex: 1 },
				]),
			],
			[noOp.name]: [toITaskData([{ data: { value: 1 } }])],
		};

		const startNodes = findStartNodes(graph, ifNode, noOp, runData);

		expect(startNodes).toHaveLength(2);
		expect(startNodes).toContainEqual({
			node: noOp,
			sourceData: {
				previousNode: ifNode,
				previousNodeOutput: 0,
				previousNodeRun: 0,
			},
		});
		expect(startNodes).toContainEqual({
			node: noOp,
			sourceData: {
				previousNode: ifNode,
				previousNodeOutput: 1,
				previousNodeRun: 0,
			},
		});
	});

	test('medium', () => {
		const trigger = createNodeData({ name: 'Trigger' });
		const ifNode = createNodeData({ name: 'If' });
		const merge1 = createNodeData({ name: 'Merge1' });
		const merge2 = createNodeData({ name: 'Merge2' });
		const noOp = createNodeData({ name: 'NoOp' });

		const graph = new DirectedGraph()
			.addNodes(trigger, ifNode, merge1, merge2, noOp)
			.addConnections(
				{ from: trigger, to: ifNode },
				{ from: ifNode, to: merge1, outputIndex: 0, inputIndex: 0 },
				{ from: ifNode, to: merge1, outputIndex: 1, inputIndex: 1 },
				{ from: ifNode, to: merge2, outputIndex: 0, inputIndex: 1 },
				{ from: ifNode, to: merge2, outputIndex: 1, inputIndex: 0 },
				{ from: merge1, to: noOp },
				{ from: merge2, to: noOp },
			);

		// no run data means the trigger is the start node
		expect(findStartNodes(graph, trigger, noOp)).toEqual([
			{ node: trigger, sourceData: undefined },
		]);

		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			[ifNode.name]: [toITaskData([{ data: { value: 1 } }])],
			[merge1.name]: [toITaskData([{ data: { value: 1 } }])],
			[merge2.name]: [toITaskData([{ data: { value: 1 } }])],
			[noOp.name]: [toITaskData([{ data: { value: 1 } }])],
		};

		const startNodes = findStartNodes(graph, trigger, noOp, runData);
		expect(startNodes).toHaveLength(2);

		// run data for everything
		expect(startNodes).toContainEqual({
			node: noOp,
			sourceData: {
				previousNode: merge1,
				previousNodeOutput: 0,
				previousNodeRun: 0,
			},
		});

		expect(startNodes).toContainEqual({
			node: noOp,
			sourceData: {
				previousNode: merge2,
				previousNodeOutput: 0,
				previousNodeRun: 0,
			},
		});
	});

	//
	//  ┌────┐         ┌─────┐
	//  │    │1───────►│     │
	//  │ if │         │merge│O
	//  │    │O───────►│     │
	//  └────┘         └─────┘
	//
	//  The merge node only gets data on one input, so the it should only be once
	//  in the start nodes
	test('multiple connections', () => {
		const ifNode = createNodeData({ name: 'if' });
		const merge = createNodeData({ name: 'merge' });

		const graph = new DirectedGraph()
			.addNodes(ifNode, merge)
			.addConnections(
				{ from: ifNode, to: merge, outputIndex: 0, inputIndex: 0 },
				{ from: ifNode, to: merge, outputIndex: 1, inputIndex: 1 },
			);

		const startNodes = findStartNodes(graph, ifNode, merge, {
			[ifNode.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 0 }])],
		});

		expect(startNodes).toHaveLength(1);
		expect(startNodes).toContainEqual({
			node: merge,
			sourceData: {
				previousNode: ifNode,
				previousNodeRun: 0,
				previousNodeOutput: 0,
			},
		});
	});

	//
	//  ┌────┐         ┌─────┐
	//  │    │0───────►│     │
	//  │ if │         │merge│O
	//  │    │1───────►│     │
	//  └────┘         └─────┘
	//
	//  The merge node only gets data on one input, so the it should only be once
	//  in the start nodes
	test('multiple connections', () => {
		const ifNode = createNodeData({ name: 'if' });
		const merge = createNodeData({ name: 'merge' });

		const graph = new DirectedGraph()
			.addNodes(ifNode, merge)
			.addConnections(
				{ from: ifNode, to: merge, outputIndex: 0, inputIndex: 0 },
				{ from: ifNode, to: merge, outputIndex: 1, inputIndex: 1 },
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

	//  ┌────┐         ┌─────┐
	//  │    │1───────►│     │
	//  │ if │         │merge│O
	//  │    │1───────►│     │
	//  └────┘         └─────┘
	//
	//  The merge node gets data on both inputs, so the it should be in the start
	//  nodes twice.
	test('multiple connections', () => {
		const ifNode = createNodeData({ name: 'if' });
		const merge = createNodeData({ name: 'merge' });

		const graph = new DirectedGraph()
			.addNodes(ifNode, merge)
			.addConnections(
				{ from: ifNode, to: merge, outputIndex: 0 },
				{ from: ifNode, to: merge, outputIndex: 1 },
			);

		const startNodes = findStartNodes(graph, ifNode, merge, {
			[ifNode.name]: [
				toITaskData([
					{ data: { value: 1 }, outputIndex: 0 },
					{ data: { value: 1 }, outputIndex: 1 },
				]),
			],
		});

		expect(startNodes).toHaveLength(2);
		expect(startNodes).toContainEqual({
			node: merge,
			sourceData: {
				previousNode: ifNode,
				previousNodeRun: 0,
				previousNodeOutput: 0,
			},
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

	//                                   ►
	//  ┌───────┐        ┌────┐         ┌─────┐
	//  │       │        │    │0───────►│     │
	//  │Trigger│1──────►│ if │         │merge│
	//  │       │        │    │1───────►│     │
	//  └───────┘        └────┘         └─────┘
	test('multiple connections with trigger', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const ifNode = createNodeData({ name: 'if' });
		const merge = createNodeData({ name: 'merge' });

		const graph = new DirectedGraph()
			.addNodes(trigger, ifNode, merge)
			.addConnections(
				{ from: trigger, to: ifNode },
				{ from: ifNode, to: merge, outputIndex: 0 },
				{ from: ifNode, to: merge, outputIndex: 1 },
			);

		const startNodes = findStartNodes(graph, ifNode, merge, {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
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

	//                              ►►
	//┌───────┐       ┌─────┐      ┌─────┐
	//│Trigger│1──┬───┤Node1│1──┬──┤Node2│
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
	test('simple', () => {
		const from = createNodeData({ name: 'From' });
		const to = createNodeData({ name: 'To' });

		const graph = new DirectedGraph().addNodes(from, to).addConnections({ from, to });

		const subgraph = findSubgraph2(graph, to, from);

		expect(subgraph).toEqual(graph);
	});

	//  ┌────┐         ┌────┐
	//  │    │O───────►│    │
	//  │ if │         │noOp│
	//  │    │O───────►│    │
	//  └────┘         └────┘
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

	test('disregard nodes after destination', () => {
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2' });
		const node3 = createNodeData({ name: 'node3' });

		const graph = new DirectedGraph()
			.addNodes(node1, node2, node3)
			.addConnections({ from: node1, to: node2 }, { from: node2, to: node3 });

		const subgraph = findSubgraph2(graph, node2, node1);

		expect(subgraph).toEqual(
			new DirectedGraph().addNodes(node1, node2).addConnections({ from: node1, to: node2 }),
		);
	});

	test('skip disabled nodes', () => {
		const node1 = createNodeData({ name: 'node1' });
		const node2 = createNodeData({ name: 'node2', disabled: true });
		const node3 = createNodeData({ name: 'node3' });

		const graph = new DirectedGraph()
			.addNodes(node1, node2, node3)
			.addConnections({ from: node1, to: node2 }, { from: node2, to: node3 });

		const subgraph = findSubgraph2(graph, node3, node1);

		expect(subgraph).toEqual(
			new DirectedGraph().addNodes(node1, node3).addConnections({ from: node1, to: node3 }),
		);
	});

	//                              ►►
	//┌───────┐       ┌─────┐      ┌─────┐
	//│Trigger├───┬───┤Node1├───┬──┤Node2│
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
	//  │Trigger├───┬─┤Node1│
	//  └───────┘   │ └─────┘
	//              │
	//  ┌─────┐     │
	//  │Node2├─────┘
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
	//  │Trigger├─┬─►│Destination├───┤AnotherNode├───┐
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
		//
		//  ┌─────┐       ┌─────┐
		//  │Node1│O─────►│Node1│
		//  └─────┘       └─────┘
		//
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
