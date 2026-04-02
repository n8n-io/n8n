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

import { type IPinData, type IRunData, type ExecutionError } from 'n8n-workflow';

import { createNodeData, toITaskData } from './helpers';
import { DirectedGraph } from '../directed-graph';
import { findStartNodes, isDirty } from '../find-start-nodes';

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

	test("if the node has run data with an error it's dirty", () => {
		const node = createNodeData({ name: 'Basic Node' });

		const runData: IRunData = {
			[node.name]: [
				toITaskData([{ data: { value: 1 } }], {
					error: { message: 'Request failed', name: 'NodeApiError' } as unknown as ExecutionError,
				}),
			],
		};

		expect(isDirty(node, runData)).toBe(true);
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

		const startNodes = findStartNodes({
			graph,
			trigger: node,
			destination: node,
			pinData: {},
			runData: {},
		});

		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node);
	});

	//                 ►►
	//  ┌───────┐     ┌─────┐     ┌───────────┐
	//  │trigger├────►│node1├────►│destination│
	//  └───────┘     └─────┘     └───────────┘
	//  trigger has run data, node1 has run data with an error.
	//  node1 should be the start node because it needs to be re-executed.
	test('treats a node with errored run data as dirty', () => {
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const destination = createNodeData({ name: 'destination' });
		const graph = new DirectedGraph()
			.addNodes(trigger, node1, destination)
			.addConnections({ from: trigger, to: node1 }, { from: node1, to: destination });

		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			[node1.name]: [
				toITaskData([{ data: { value: 1 } }], {
					error: { message: 'Request failed', name: 'NodeApiError' } as unknown as ExecutionError,
				}),
			],
		};

		const startNodes = findStartNodes({
			graph,
			trigger,
			destination,
			runData,
			pinData: {},
		});

		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node1);
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
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination,
				pinData: {},
				runData: {},
			});

			expect(startNodes.size).toBe(1);
			expect(startNodes).toContainEqual(trigger);
		}

		// if the trigger has run data
		{
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			};

			const startNodes = findStartNodes({
				graph,
				trigger,
				destination,
				runData,
				pinData: {},
			});

			expect(startNodes.size).toBe(1);
			expect(startNodes).toContainEqual(destination);
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
		const startNodes = findStartNodes({
			graph,
			trigger,
			destination: node,
			runData,
			pinData: {},
		});

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node);
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
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination: node4,
				pinData: {},
				runData: {},
			});

			// ASSERT
			expect(startNodes.size).toBe(1);
			// no run data means the trigger is the start node
			expect(startNodes).toContainEqual(trigger);
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
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination: node4,
				runData,
				pinData: {},
			});

			// ASSERT
			expect(startNodes.size).toBe(1);
			expect(startNodes).toContainEqual(node4);
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
			pinData: {},
		});

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node);
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
			pinData: {},
		});

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node);
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
			pinData: {},
		});

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node);
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
			pinData: {},
		});

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node3);
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
			pinData: {},
		});

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node2);
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
		const startNodes = findStartNodes({
			graph,
			trigger,
			destination: node2,
			runData,
			pinData,
		});

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(node2);
	});

	describe('pinData', () => {
		//               PD              ►►
		// ┌───────┐1   ┌──────────┐0   ┌───────────┐
		// │trigger├────►pinnedNode├────►destination│
		// └───────┘    └──────────┘    └───────────┘
		test('does not stop recursing when the first node that has no run data has pinned data', () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger' });
			const pinnedNode = createNodeData({ name: 'pinnedNode' });
			const destination = createNodeData({ name: 'destinationNode' });
			const graph = new DirectedGraph()
				.addNodes(trigger, destination, pinnedNode)
				.addConnections({ from: trigger, to: pinnedNode }, { from: pinnedNode, to: destination });
			const pinData: IPinData = { [pinnedNode.name]: [{ json: { value: 1 } }] };
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			};

			// ACT
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination,
				runData,
				pinData,
			});

			// ASSERT
			expect(startNodes.size).toBe(1);
			expect(startNodes).toContain(destination);
		});
	});

	describe('custom loop logic', () => {
		//                       ►►
		//             ┌────┐0  ┌─────────┐
		// ┌───────┐1  │    ├───►afterLoop│
		// │trigger├─┬─►loop│1  └─────────┘
		// └───────┘ │ │    ├─┐ ┌──────┐1
		//           │ └────┘ └─►inLoop├──┐
		//           │          └──────┘  │
		//           └────────────────────┘
		//
		test('if the last run of loop node has no data (null) on the done output, then the loop is the start node', () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger' });
			const loop = createNodeData({ name: 'loop', type: 'n8n-nodes-base.splitInBatches' });
			const inLoop = createNodeData({ name: 'inLoop' });
			const afterLoop = createNodeData({ name: 'afterLoop' });
			const graph = new DirectedGraph()
				.addNodes(trigger, loop, inLoop, afterLoop)
				.addConnections(
					{ from: trigger, to: loop },
					{ from: loop, outputIndex: 1, to: inLoop },
					{ from: inLoop, to: loop },
					{ from: loop, to: afterLoop },
				);
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: 'trigger' } }])],
				[loop.name]: [
					// only output on the `loop` branch, but no output on the `done`
					// branch
					toITaskData([{ outputIndex: 1, data: { name: 'loop' } }]),
				],
				[inLoop.name]: [toITaskData([{ data: { name: 'inLoop' } }])],
			};

			// ACT
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination: afterLoop,
				runData,
				pinData: {},
			});

			// ASSERT
			expect(startNodes.size).toBe(1);
			expect(startNodes).toContainEqual(loop);
		});

		//                       ►►
		//             ┌────┐0  ┌─────────┐
		// ┌───────┐1  │    ├───►afterLoop│
		// │trigger├─┬─►loop│1  └─────────┘
		// └───────┘ │ │    ├─┐ ┌──────┐1
		//           │ └────┘ └─►inLoop├──┐
		//           │          └──────┘  │
		//           └────────────────────┘
		//
		test('if the last run of loop node has no data (empty array) on the done output, then the loop is the start  node', () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger' });
			const loop = createNodeData({ name: 'loop', type: 'n8n-nodes-base.splitInBatches' });
			const inLoop = createNodeData({ name: 'inLoop' });
			const afterLoop = createNodeData({ name: 'afterLoop' });
			const graph = new DirectedGraph()
				.addNodes(trigger, loop, inLoop, afterLoop)
				.addConnections(
					{ from: trigger, to: loop },
					{ from: loop, outputIndex: 1, to: inLoop },
					{ from: inLoop, to: loop },
					{ from: loop, to: afterLoop },
				);
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: 'trigger' } }])],
				[loop.name]: [
					// This is handcrafted because `toITaskData` does not allow inserting
					// an empty array like the first element of `main` below. But the
					// execution engine creates ITaskData like this.
					{
						executionStatus: 'success',
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
						data: { main: [[], [{ json: { name: 'loop' } }]] },
					},
				],
				[inLoop.name]: [toITaskData([{ data: { name: 'inLoop' } }])],
			};

			// ACT
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination: afterLoop,
				runData,
				pinData: {},
			});

			// ASSERT
			expect(startNodes.size).toBe(1);
			expect(startNodes).toContainEqual(loop);
		});

		//                       ►►
		//             ┌────┐1  ┌─────────┐
		// ┌───────┐1  │    ├───►afterLoop│
		// │trigger├─┬─►loop│1  └─────────┘
		// └───────┘ │ │    ├─┐ ┌──────┐1
		//           │ └────┘ └─►inLoop├──┐
		//           │          └──────┘  │
		//           └────────────────────┘
		//
		test('if the loop has data on the done output in the last run it does not become a start node', () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger' });
			const loop = createNodeData({ name: 'loop', type: 'n8n-nodes-base.splitInBatches' });
			const inLoop = createNodeData({ name: 'inLoop' });
			const afterLoop = createNodeData({ name: 'afterLoop' });
			const graph = new DirectedGraph()
				.addNodes(trigger, loop, inLoop, afterLoop)
				.addConnections(
					{ from: trigger, to: loop },
					{ from: loop, outputIndex: 1, to: inLoop },
					{ from: inLoop, to: loop },
					{ from: loop, to: afterLoop },
				);
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: 'trigger' } }])],
				[loop.name]: [
					toITaskData([{ outputIndex: 1, data: { name: 'loop' } }]),
					toITaskData([{ outputIndex: 0, data: { name: 'done' } }]),
				],
				[inLoop.name]: [toITaskData([{ data: { name: 'inLoop' } }])],
			};

			// ACT
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination: afterLoop,
				runData,
				pinData: {},
			});

			// ASSERT
			expect(startNodes.size).toBe(1);
			expect(startNodes).toContainEqual(afterLoop);
		});

		// 	                      done (empty)
		//                      ┌────►
		// ┌─────────┐1 ┌────┐1 │
		// │ trigger ┼──►loop┼─┬┘  ►►
		// └─────────┘  └────┘ │  ┌────────┐
		//                     └─►│in loop │
		//                        └────────┘
		test('if a loop node does not actually form a loop in the graph, it uses loop output instead of done output', () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger' });
			const loop = createNodeData({ name: 'loop', type: 'n8n-nodes-base.splitInBatches' });
			const inLoop = createNodeData({ name: 'inLoop' });
			const graph = new DirectedGraph().addNodes(trigger, loop, inLoop).addConnections(
				{ from: trigger, to: loop },
				// Note: loop connects to inLoop via output 1, but there's no connection
				// back to loop, so it's not actually a loop
				{ from: loop, outputIndex: 1, to: inLoop },
			);
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: 'trigger' } }])],
				// The loop node has data on output 1 (the first output), but not on output 0 (done)
				[loop.name]: [toITaskData([{ outputIndex: 1, data: { name: 'loop' } }])],
			};

			// ACT
			const startNodes = findStartNodes({
				graph,
				trigger,
				destination: inLoop,
				runData,
				pinData: {},
			});

			// ASSERT
			// Because the loop node doesn't form an actual loop, it should check output 1
			// for run data (not output 0). Since output 1 has data, the loop node should
			// not be a start node, and we should continue to inLoop.
			expect(startNodes.size).toBe(1);
			expect(startNodes).toContainEqual(inLoop);
		});
	});
});
