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
import type { DirectedGraph } from './DirectedGraph';
import { getIncomingData } from './getIncomingData';
import { getSourceDataGroups } from './getSourceDataGroups';

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
