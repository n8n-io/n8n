// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// PD denotes that the node has pinned data

import { NodeConnectionType, type IRunData } from 'n8n-workflow';
import { DirectedGraph } from '../DirectedGraph';
import { createNodeData, toITaskData } from './helpers';
import { getSourceDataGroups } from '../recreateNodeExecutionStack';

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
		const pinnedData: IRunData = {};

		const groups = getSourceDataGroups(graph, node, runData, pinnedData);

		expect(groups).toHaveLength(2);

		const group1 = groups[0];
		expect(group1).toHaveLength(2);
		expect(group1[0]).toEqual({
			from: source1,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
		expect(group1[1]).toEqual({
			from: source3,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 1,
			to: node,
		});

		const group2 = groups[1];
		expect(group2).toHaveLength(1);
		expect(group2[0]).toEqual({
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
		const pinnedData: IRunData = {
			[source1.name]: [toITaskData([{ data: { value: 1 } }])],
			[source2.name]: [toITaskData([{ data: { value: 1 } }])],
			[source3.name]: [toITaskData([{ data: { value: 1 } }])],
		};

		const groups = getSourceDataGroups(graph, node, runData, pinnedData);

		expect(groups).toHaveLength(2);

		const group1 = groups[0];
		expect(group1).toHaveLength(2);
		expect(group1[0]).toEqual({
			from: source1,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
		expect(group1[1]).toEqual({
			from: source3,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 1,
			to: node,
		});

		const group2 = groups[1];
		expect(group2).toHaveLength(1);
		expect(group2[0]).toEqual({
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
		const pinnedData: IRunData = {};

		const groups = getSourceDataGroups(graph, node, runData, pinnedData);

		expect(groups).toHaveLength(2);

		const group1 = groups[0];
		expect(group1).toHaveLength(2);
		expect(group1[0]).toEqual({
			from: source2,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
		expect(group1[1]).toEqual({
			from: source3,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 1,
			to: node,
		});

		const group2 = groups[1];
		expect(group2).toHaveLength(1);
		expect(group2[0]).toEqual({
			from: source1,
			outputIndex: 0,
			type: NodeConnectionType.Main,
			inputIndex: 0,
			to: node,
		});
	});
});
