// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// PD denotes that the node has pinned data

import type { IPinData } from 'n8n-workflow';
import { NodeConnectionType, type IRunData } from 'n8n-workflow';
import { DirectedGraph } from '../DirectedGraph';
import { createNodeData, toITaskData } from './helpers';
import { getSourceDataGroups } from '../getSourceDataGroups';
import { inspect } from 'util';

describe('getSourceDataGroups', () => {
	//┌───────┐1
	//│source1├────┐
	//└───────┘    │   ┌────┐
	//┌───────┐1   ├──►│    │
	//│source2├────┘   │node│
	//└───────┘    ┌──►│    │
	//┌───────┐1   │   └────┘
	//│source3├────┘
	//└───────┘
	it('groups sources into possibly complete sets if all of them have data', () => {
		// ARRANGE
		const source1 = createNodeData({ name: 'source1' });
		const source2 = createNodeData({ name: 'source2' });
		const source3 = createNodeData({ name: 'source3' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(source1, source2, source3, node)
			.addConnections(
				{ from: source1, to: node, inputIndex: 0 },
				{ from: source2, to: node, inputIndex: 0 },
				{ from: source3, to: node, inputIndex: 1 },
			);
		const runData: IRunData = {
			[source1.name]: [toITaskData([{ data: { value: 1 } }])],
			[source2.name]: [toITaskData([{ data: { value: 1 } }])],
			[source3.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinnedData: IPinData = {};

		// ACT
		const groups = getSourceDataGroups(graph, node, runData, pinnedData);

		// ASSERT
		expect(groups).toHaveLength(2);

		const group1 = groups[0];
		expect(group1.connections).toHaveLength(2);
		expect(group1.connections[0]).toEqual({
			from: source1,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
		expect(group1.connections[1]).toEqual({
			from: source3,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 1,
			to: node,
		});

		const group2 = groups[1];
		expect(group2.connections).toHaveLength(1);
		expect(group2.connections[0]).toEqual({
			from: source2,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
	});

	//┌───────┐PD
	//│source1├────┐
	//└───────┘    │   ┌────┐
	//┌───────┐PD  ├──►│    │
	//│source2├────┘   │node│
	//└───────┘    ┌──►│    │
	//┌───────┐PD  │   └────┘
	//│source3├────┘
	//└───────┘
	it('groups sources into possibly complete sets if all of them have data', () => {
		// ARRANGE
		const source1 = createNodeData({ name: 'source1' });
		const source2 = createNodeData({ name: 'source2' });
		const source3 = createNodeData({ name: 'source3' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(source1, source2, source3, node)
			.addConnections(
				{ from: source1, to: node, inputIndex: 0 },
				{ from: source2, to: node, inputIndex: 0 },
				{ from: source3, to: node, inputIndex: 1 },
			);
		const runData: IRunData = {};
		const pinnedData: IPinData = {
			[source1.name]: [{ json: { value: 1 } }],
			[source2.name]: [{ json: { value: 2 } }],
			[source3.name]: [{ json: { value: 3 } }],
		};

		// ACT
		const groups = getSourceDataGroups(graph, node, runData, pinnedData);

		// ASSERT
		expect(groups).toHaveLength(2);

		const group1 = groups[0];
		expect(group1.connections).toHaveLength(2);
		expect(group1.connections[0]).toEqual({
			from: source1,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
		expect(group1.connections[1]).toEqual({
			from: source3,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 1,
			to: node,
		});

		const group2 = groups[1];
		expect(group2.connections).toHaveLength(1);
		expect(group2.connections[0]).toEqual({
			from: source2,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
	});

	//┌───────┐0
	//│source1├────┐
	//└───────┘    │   ┌────┐
	//┌───────┐1   ├──►│    │
	//│source2├────┘   │node│
	//└───────┘    ┌──►│    │
	//┌───────┐1   │   └────┘
	//│source3├────┘
	//└───────┘
	it('groups sources into possibly complete sets if all of them have data', () => {
		// ARRANGE
		const source1 = createNodeData({ name: 'source1' });
		const source2 = createNodeData({ name: 'source2' });
		const source3 = createNodeData({ name: 'source3' });
		const node = createNodeData({ name: 'node' });

		const graph = new DirectedGraph()
			.addNodes(source1, source2, source3, node)
			.addConnections(
				{ from: source1, to: node, inputIndex: 0 },
				{ from: source2, to: node, inputIndex: 0 },
				{ from: source3, to: node, inputIndex: 1 },
			);
		const runData: IRunData = {
			[source2.name]: [toITaskData([{ data: { value: 1 } }])],
			[source3.name]: [toITaskData([{ data: { value: 1 } }])],
		};
		const pinnedData: IPinData = {};

		// ACT
		const groups = getSourceDataGroups(graph, node, runData, pinnedData);

		// ASSERT
		expect(groups).toHaveLength(1);

		const group1 = groups[0];
		expect(group1.connections).toHaveLength(2);
		expect(group1.connections[0]).toEqual({
			from: source2,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
		expect(group1.connections[1]).toEqual({
			from: source3,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 1,
			to: node,
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
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { nodeName: 'trigger' } }])],
			[node1.name]: [toITaskData([{ data: { nodeName: 'node1' } }])],
		};
		const pinData: IPinData = {};

		// ACT
		const groups = getSourceDataGroups(graph, node3, runData, pinData);

		// ASSERT
		expect(groups).toHaveLength(1);
		const group1 = groups[0];
		expect(group1.connections).toHaveLength(2);
		expect(group1.complete).toEqual(false);
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
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { nodeName: 'trigger' } }])],
			[node2.name]: [toITaskData([{ data: { nodeName: 'node2' } }])],
		};
		const pinData: IPinData = {};

		// ACT
		const groups = getSourceDataGroups(graph, node3, runData, pinData);

		// ASSERT
		console.log(inspect(groups, { colors: true, sorted: true, depth: null, compact: true }));
		expect(groups).toHaveLength(1);
		const group1 = groups[0];
		expect(group1.connections).toHaveLength(2);
		expect(group1.complete).toEqual(false);
	});
});
