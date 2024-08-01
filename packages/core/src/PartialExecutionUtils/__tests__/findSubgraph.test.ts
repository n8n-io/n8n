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

import { DirectedGraph } from '../DirectedGraph';
import { findSubgraph } from '../findSubgraph';
import { createNodeData } from './helpers';

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

		const subgraph = findSubgraph(graph, destination, trigger);

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

		const subgraph = findSubgraph(graph, noOp, ifNode);

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

		const subgraph = findSubgraph(graph, destination, trigger);

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

		const subgraph = findSubgraph(graph, destination, trigger);

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
		const subgraph = findSubgraph(graph, node2, trigger);

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
		const subgraph = findSubgraph(graph, node1, trigger);

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
		const subgraph = findSubgraph(graph, destination, trigger);

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
