import type { IRunData } from 'n8n-workflow';

import { createNodeData, toITaskData } from './helpers';
import { cleanRunData } from '../cleanRunData';
import { DirectedGraph } from '../DirectedGraph';

describe('cleanRunData', () => {
	// ┌─────┐    ┌─────┐   ┌─────┐
	// │node1├───►│node2├──►│node3│
	// └─────┘    └─────┘   └─────┘
	test('deletes all run data of all children and the node being passed in', () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'Node1' });
		const node2 = createNodeData({ name: 'Node2' });
		const node3 = createNodeData({ name: 'Node3' });
		const graph = new DirectedGraph()
			.addNodes(node1, node2, node3)
			.addConnections({ from: node1, to: node2 }, { from: node2, to: node3 });
		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 2 } }])],
			[node3.name]: [toITaskData([{ data: { value: 3 } }])],
		};

		// ACT
		const newRunData = cleanRunData(runData, graph, new Set([node1]));

		// ASSERT
		expect(newRunData).toEqual({});
	});

	// ┌─────┐    ┌─────┐   ┌─────┐
	// │node1├───►│node2├──►│node3│
	// └─────┘    └─────┘   └─────┘
	test('retains the run data of parent nodes of the node being passed in', () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'Node1' });
		const node2 = createNodeData({ name: 'Node2' });
		const node3 = createNodeData({ name: 'Node3' });
		const graph = new DirectedGraph()
			.addNodes(node1, node2, node3)
			.addConnections({ from: node1, to: node2 }, { from: node2, to: node3 });
		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 2 } }])],
			[node3.name]: [toITaskData([{ data: { value: 3 } }])],
		};

		// ACT
		const newRunData = cleanRunData(runData, graph, new Set([node2]));

		// ASSERT
		expect(newRunData).toEqual({ [node1.name]: runData[node1.name] });
	});

	//     ┌─────┐    ┌─────┐   ┌─────┐
	//  ┌─►│node1├───►│node2├──►│node3├─┐
	//  │  └─────┘    └─────┘   └─────┘ │
	//  │                               │
	//  └───────────────────────────────┘
	test('terminates when finding a cycle', () => {
		// ARRANGE
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

		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 2 } }])],
			[node3.name]: [toITaskData([{ data: { value: 3 } }])],
		};

		// ACT
		const newRunData = cleanRunData(runData, graph, new Set([node2]));

		// ASSERT
		// TODO: Find out if this is a desirable result in milestone 2
		expect(newRunData).toEqual({});
	});

	// ┌─────┐    ┌─────┐
	// │node1├───►│node2│
	// └─────┘    └─────┘
	test('removes run data of nodes that are not in the subgraph', () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'Node1' });
		const node2 = createNodeData({ name: 'Node2' });
		const graph = new DirectedGraph()
			.addNodes(node1, node2)
			.addConnections({ from: node1, to: node2 });
		// not part of the graph
		const node3 = createNodeData({ name: 'Node3' });
		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 2 } }])],
			[node3.name]: [toITaskData([{ data: { value: 3 } }])],
		};

		// ACT
		const newRunData = cleanRunData(runData, graph, new Set([node2]));

		// ASSERT
		expect(newRunData).toEqual({
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
		});
	});
});
