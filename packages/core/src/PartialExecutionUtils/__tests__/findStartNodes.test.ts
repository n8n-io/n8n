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

import { type IPinData, type IRunData } from 'n8n-workflow';

import { createNodeData, toITaskData } from './helpers';
import { DirectedGraph } from '../DirectedGraph';
import { findStartNodes, isDirty } from '../findStartNodes';

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

		const startNodes = findStartNodes({ graph, trigger: node, destination: node });

		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node);
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
			const startNodes = findStartNodes({ graph, trigger, destination });

			expect(startNodes).toHaveLength(1);
			expect(startNodes[0]).toEqual(trigger);
		}

		// if the trigger has run data
		{
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			};

			const startNodes = findStartNodes({ graph, trigger, destination, runData });

			expect(startNodes).toHaveLength(1);
			expect(startNodes[0]).toEqual(destination);
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
		// ARRANGE
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

		// ACT
		const startNodes = findStartNodes({ graph, trigger, destination: node, runData });

		// ASSERT
		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node);
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
		// ARRANGE
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
			// ACT
			const startNodes = findStartNodes({ graph, trigger, destination: node4 });

			// ASSERT
			expect(startNodes).toHaveLength(1);
			// no run data means the trigger is the start node
			expect(startNodes[0]).toEqual(trigger);
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

			// ACT
			const startNodes = findStartNodes({ graph, trigger, destination: node4, runData });

			// ASSERT
			expect(startNodes).toHaveLength(1);
			expect(startNodes[0]).toEqual(node4);
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
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections(
				{ from: trigger, to: node, inputIndex: 0, outputIndex: 0 },
				{ from: trigger, to: node, inputIndex: 1, outputIndex: 1 },
			);

		// ACT
		const startNodes = findStartNodes({
			graph,
			trigger,
			destination: node,
			runData: {
				[trigger.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 0 }])],
			},
		});

		// ASSERT
		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node);
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
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections(
				{ from: trigger, to: node, inputIndex: 0, outputIndex: 0 },
				{ from: trigger, to: node, inputIndex: 1, outputIndex: 1 },
			);

		// ACT
		const startNodes = findStartNodes({
			graph,
			trigger,
			destination: node,
			runData: {
				[trigger.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 1 }])],
			},
		});

		// ASSERT
		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node);
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
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(trigger, node)
			.addConnections(
				{ from: trigger, to: node, inputIndex: 0, outputIndex: 0 },
				{ from: trigger, to: node, inputIndex: 1, outputIndex: 1 },
			);

		// ACT
		const startNodes = findStartNodes({
			graph,
			trigger,
			destination: node,
			runData: {
				[trigger.name]: [
					toITaskData([
						{ data: { value: 1 }, outputIndex: 0 },
						{ data: { value: 1 }, outputIndex: 1 },
					]),
				],
			},
		});

		// ASSERT
		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node);
	});

	//                     ►►
	//  ┌───────┐         ┌────┐
	//  │       │1  ┌────►│    │
	//  │trigger├───┤     │node│
	//  │       │   └────►│    │
	//  └───────┘         └────┘
	test('multiple connections with both having data', () => {
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

		// ACT
		const startNodes = findStartNodes({
			graph,
			trigger,
			destination: node3,
			runData: {
				[trigger.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 0 }])],
				[node1.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 0 }])],
				[node2.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 0 }])],
			},
		});

		// ASSERT
		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node3);
	});

	//                                    ►►
	//  ┌───────┐        ┌─────┐0        ┌─────┐
	//  │       │1       │     ├────────►│     │
	//  │trigger├───────►│node1│         │node2│
	//  │       │        │     ├────────►│     │
	//  └───────┘        └─────┘1        └─────┘
	test('multiple connections with trigger', () => {
		// ARRANGE
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

		// ACT
		const startNodes = findStartNodes({
			graph,
			trigger: node1,
			destination: node2,
			runData: {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
				[node1.name]: [toITaskData([{ data: { value: 1 }, outputIndex: 1 }])],
			},
		});

		// ASSERT
		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node2);
	});

	//                              ►►
	//┌───────┐1      ┌─────┐1     ┌─────┐
	//│Trigger├───┬──►│Node1├───┬─►│Node2│
	//└───────┘   │   └─────┘   │  └─────┘
	//            │             │
	//            └─────────────┘
	test('terminates when called with graph that contains cycles', () => {
		// ARRANGE
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

		// ACT
		const startNodes = findStartNodes({ graph, trigger, destination: node2, runData, pinData });

		// ASSERT
		expect(startNodes).toHaveLength(1);
		expect(startNodes[0]).toEqual(node2);
	});
});
