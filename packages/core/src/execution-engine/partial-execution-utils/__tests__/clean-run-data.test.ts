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

import { NodeConnectionTypes, type IRunData } from 'n8n-workflow';

import { createNodeData, toITaskData } from './helpers';
import { cleanRunData } from '../clean-run-data';
import { DirectedGraph } from '../directed-graph';

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

	//               ►
	//  ┌─────┐     ┌────────┐
	//  │node1├─────►rootNode│
	//  └─────┘     └───▲────┘
	//                  │
	//              ┌───┴───┐
	//              │subNode│
	//              └───────┘
	test('removes run data of sub nodes when the start node is a root node', () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'Node1' });
		const rootNode = createNodeData({ name: 'Root Node' });
		const subNode = createNodeData({ name: 'Sub Node' });
		const graph = new DirectedGraph()
			.addNodes(node1, rootNode, subNode)
			.addConnections(
				{ from: node1, to: rootNode },
				{ from: subNode, to: rootNode, type: NodeConnectionTypes.AiLanguageModel },
			);
		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[rootNode.name]: [toITaskData([{ data: { value: 2 } }])],
			[subNode.name]: [toITaskData([{ data: { value: 3 } }])],
		};

		// ACT
		const newRunData = cleanRunData(runData, graph, new Set([rootNode]));

		// ASSERT
		expect(newRunData).toEqual({
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
		});
	});

	//            ►
	// ┌─────┐   ┌─────┐    ┌────────┐
	// │node1├───►node2├────►rootNode│
	// └─────┘   └─────┘    └───▲────┘
	//                          │
	//                      ┌───┴───┐
	//                      │subNode│
	//                      └───────┘
	test('removes run data of sub nodes for root nodes downstream of the start node', () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'Node1' });
		const node2 = createNodeData({ name: 'Node2' });
		const rootNode = createNodeData({ name: 'Root Node' });
		const subNode = createNodeData({ name: 'Sub Node' });
		const graph = new DirectedGraph()
			.addNodes(node1, node2, rootNode, subNode)
			.addConnections(
				{ from: node1, to: node2 },
				{ from: node2, to: rootNode },
				{ from: subNode, to: rootNode, type: NodeConnectionTypes.AiLanguageModel },
			);
		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[node2.name]: [toITaskData([{ data: { value: 1 } }])],
			[rootNode.name]: [toITaskData([{ data: { value: 2 } }])],
			[subNode.name]: [toITaskData([{ data: { value: 3 } }])],
		};

		// ACT
		const newRunData = cleanRunData(runData, graph, new Set([node2]));

		// ASSERT
		expect(newRunData).toEqual({
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
		});
	});

	//           ►
	// ┌─────┐  ┌────────┐  ┌────────┐
	// │node1├──►rootNode├──►rootNode│
	// └─────┘  └───▲────┘  └───▲────┘
	//              │           │
	//              │       ┌───┴───┐
	//              └───────┤subNode│
	//                      └───────┘
	test('removes run data of sub nodes as well if the sub node is shared between multiple root nodes', () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'Node1' });
		const rootNode1 = createNodeData({ name: 'Root Node 1' });
		const rootNode2 = createNodeData({ name: 'Root Node 2' });
		const subNode = createNodeData({ name: 'Sub Node' });
		const graph = new DirectedGraph()
			.addNodes(node1, rootNode1, rootNode2, subNode)
			.addConnections(
				{ from: node1, to: rootNode1 },
				{ from: rootNode1, to: rootNode2 },
				{ from: subNode, to: rootNode1, type: NodeConnectionTypes.AiLanguageModel },
				{ from: subNode, to: rootNode2, type: NodeConnectionTypes.AiLanguageModel },
			);
		const runData: IRunData = {
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
			[rootNode1.name]: [toITaskData([{ data: { value: 1 } }])],
			[rootNode2.name]: [toITaskData([{ data: { value: 2 } }])],
			[subNode.name]: [toITaskData([{ data: { value: 3 } }])],
		};

		// ACT
		const newRunData = cleanRunData(runData, graph, new Set([rootNode1]));

		// ASSERT
		expect(newRunData).toEqual({
			[node1.name]: [toITaskData([{ data: { value: 1 } }])],
		});
	});
});
