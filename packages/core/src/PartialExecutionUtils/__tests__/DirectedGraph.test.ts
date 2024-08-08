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

import { NodeConnectionType } from 'n8n-workflow';
import { DirectedGraph } from '../DirectedGraph';
import { createNodeData, defaultWorkflowParameter } from './helpers';

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
