import {
	NodeConnectionType,
	type IExecuteData,
	type INode,
	type INodeExecutionData,
	type IPinData,
	type IRunData,
	type ISourceData,
	type ITaskDataConnectionsSource,
	type IWaitingForExecution,
	type IWaitingForExecutionSource,
} from 'n8n-workflow';

import * as a from 'assert/strict';
import type { Connection, DirectedGraph } from './DirectedGraph';
import { getIncomingData } from './getIncomingData';

function sortByInputIndexThenByName(connection1: Connection, connection2: Connection): number {
	if (connection1.inputIndex === connection2.inputIndex) {
		return connection1.from.name.localeCompare(connection2.from.name);
	} else {
		return connection1.inputIndex - connection2.inputIndex;
	}
}

// INFO: I don't need to care about connections without data. I just have to
// make sure all connections have data, otherwise the node that was passed in
// is not a valid startNode, startNodes must have data on all incoming
// connections.
// TODO: assert that all incoming connections have run data of pinned data.
// TODO: remove all code handling connections without data

/**
 * Groups incoming connections to the node. The groups contain one connection
 * per input, if possible, with run data or pinned data, if possible.
 *
 * The purpose of this is to get as many complete sets of data for executing
 * nodes with multiple inputs.
 *
 * # Example 1:
 * ┌───────┐1
 * │source1├────┐
 * └───────┘    │   ┌────┐
 * ┌───────┐1   ├──►│    │
 * │source2├────┘   │node│
 * └───────┘    ┌──►│    │
 * ┌───────┐1   │   └────┘
 * │source3├────┘
 * └───────┘
 *
 * Given this workflow, and assuming all sources have run data or pinned data,
 * it's possible to run `node` with the data of `source1` and `source3` and
 * then one more time with the data from `source2`.
 *
 * It would also be possible to run `node` with the data of `source2` and
 * `source3` and then one more time with the data from `source1`.
 *
 * To improve the determinism of this the connections are sorted by input and
 * then by from-node name.
 *
 * So this will return 2 groups:
 * 1. source1 and source3
 * 2. source2
 *
 * # Example 1:
 * ┌───────┐0
 * │source1├────┐
 * └───────┘    │   ┌────┐
 * ┌───────┐1   ├──►│    │
 * │source2├────┘   │node│
 * └───────┘    ┌──►│    │
 * ┌───────┐1   │   └────┘
 * │source3├────┘
 * └───────┘
 *
 * Since `source1` has no run data and no pinned data it's skipped in favor of
 * `source2` for the for input.
 *
 * So this will return 2 groups:
 * 1. source2 and source3
 * 2. source1
 */
export function getSourceDataGroups(
	graph: DirectedGraph,
	node: INode,
	runData: IRunData,
	pinnedData: IPinData,
): Connection[][] {
	const connections = graph.getConnections({ to: node });

	const sortedConnectionsWithData = [];

	for (const connection of connections) {
		const hasData = runData[connection.from.name] || pinnedData[connection.from.name];

		if (hasData) {
			sortedConnectionsWithData.push(connection);
		}
	}

	sortedConnectionsWithData.sort(sortByInputIndexThenByName);

	const groups: Connection[][] = [];
	let currentGroup: Connection[] = [];
	let currentInputIndex = -1;

	while (sortedConnectionsWithData.length > 0) {
		const connectionWithDataIndex = sortedConnectionsWithData.findIndex(
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			(c) => c.inputIndex > currentInputIndex,
		);
		const connection: Connection | undefined = sortedConnectionsWithData[connectionWithDataIndex];

		if (connection === undefined) {
			groups.push(currentGroup);
			currentGroup = [];
			currentInputIndex = -1;
			continue;
		}

		currentInputIndex = connection.inputIndex;
		currentGroup.push(connection);

		if (connectionWithDataIndex >= 0) {
			sortedConnectionsWithData.splice(connectionWithDataIndex, 1);
		}
	}

	groups.push(currentGroup);

	return groups;
}

export function recreateNodeExecutionStack(
	graph: DirectedGraph,
	startNodes: INode[],
	destinationNode: INode,
	runData: IRunData,
	pinData: IPinData,
): {
	nodeExecutionStack: IExecuteData[];
	waitingExecution: IWaitingForExecution;
	waitingExecutionSource: IWaitingForExecutionSource;
} {
	// Validate invariants.

	// The graph needs to be free of disabled nodes. If it's not it hasn't been
	// passed through findSubgraph2.
	for (const node of graph.getNodes().values()) {
		a.notEqual(
			node.disabled,
			true,
			`Graph contains disabled nodes. This is not supported. Make sure to pass the graph through "findSubgraph2" before calling "recreateNodeExecutionStack". The node in question is "${node.name}"`,
		);
	}

	// Initialize the nodeExecutionStack and waitingExecution with
	// the data from runData
	const nodeExecutionStack: IExecuteData[] = [];
	const waitingExecution: IWaitingForExecution = {};
	const waitingExecutionSource: IWaitingForExecutionSource = {};

	// TODO: Don't hard code this!
	const runIndex = 0;

	for (const startNode of startNodes) {
		const incomingStartNodeConnections = graph
			.getDirectParents(startNode)
			.filter((c) => c.type === NodeConnectionType.Main);

		let incomingData: INodeExecutionData[][] = [];
		let incomingSourceData: ITaskDataConnectionsSource | null = null;

		if (incomingStartNodeConnections.length === 0) {
			incomingData.push([{ json: {} }]);

			const executeData: IExecuteData = {
				node: startNode,
				data: { main: incomingData },
				source: incomingSourceData,
			};

			nodeExecutionStack.push(executeData);
		} else {
			const sourceDataSets = getSourceDataGroups(graph, startNode, runData, pinData);

			for (const sourceData of sourceDataSets) {
				incomingData = [];

				incomingSourceData = { main: [] };

				for (const incomingConnection of sourceData) {
					const node = incomingConnection.from;

					if (pinData[node.name]) {
						incomingData.push(pinData[node.name]);
					} else {
						a.ok(
							runData[node.name],
							`Start node(${incomingConnection.to.name}) has an incoming connection with no run or pinned data. This is not supported. The connection in question is "${node.name}->${startNode.name}". Are you sure the start nodes come from the "findStartNodes" function?`,
						);

						const nodeIncomingData = getIncomingData(
							runData,
							node.name,
							runIndex,
							incomingConnection.type,
							incomingConnection.outputIndex,
						);

						if (nodeIncomingData) {
							incomingData.push(nodeIncomingData);
						}
					}

					incomingSourceData.main.push({
						previousNode: incomingConnection.from.name,
						previousNodeOutput: incomingConnection.outputIndex,
						previousNodeRun: 0,
					});
				}

				const executeData: IExecuteData = {
					node: startNode,
					data: { main: incomingData },
					source: incomingSourceData,
				};

				nodeExecutionStack.push(executeData);
			}
		}

		// TODO: Do we need this?
		if (destinationNode) {
			const destinationNodeName = destinationNode.name;
			// Check if the destinationNode has to be added as waiting
			// because some input data is already fully available
			const incomingDestinationNodeConnections = graph
				.getDirectParents(destinationNode)
				.filter((c) => c.type === NodeConnectionType.Main);
			if (incomingDestinationNodeConnections !== undefined) {
				for (const connection of incomingDestinationNodeConnections) {
					if (waitingExecution[destinationNodeName] === undefined) {
						waitingExecution[destinationNodeName] = {};
						waitingExecutionSource[destinationNodeName] = {};
					}
					if (waitingExecution[destinationNodeName][runIndex] === undefined) {
						waitingExecution[destinationNodeName][runIndex] = {};
						waitingExecutionSource[destinationNodeName][runIndex] = {};
					}
					if (waitingExecution[destinationNodeName][runIndex][connection.type] === undefined) {
						waitingExecution[destinationNodeName][runIndex][connection.type] = [];
						waitingExecutionSource[destinationNodeName][runIndex][connection.type] = [];
					}

					if (runData[connection.from.name] !== undefined) {
						// Input data exists so add as waiting
						// incomingDataDestination.push(runData[connection.node!][runIndex].data![connection.type][connection.index]);
						waitingExecution[destinationNodeName][runIndex][connection.type].push(
							runData[connection.from.name][runIndex].data![connection.type][connection.inputIndex],
						);
						waitingExecutionSource[destinationNodeName][runIndex][connection.type].push({
							previousNode: connection.from.name,
							previousNodeOutput: connection.inputIndex || undefined,
							previousNodeRun: runIndex || undefined,
						} as ISourceData);
					} else {
						waitingExecution[destinationNodeName][runIndex][connection.type].push(null);
						waitingExecutionSource[destinationNodeName][runIndex][connection.type].push(null);
					}
				}
			}
		}
	}

	return {
		nodeExecutionStack,
		waitingExecution,
		waitingExecutionSource,
	};
}
