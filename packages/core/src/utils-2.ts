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

import * as a from 'assert';
import type { DirectedGraph, StartNodeData } from './utils';
import { getIncomingData } from './utils';

// eslint-disable-next-line @typescript-eslint/promise-function-async, complexity
export function recreateNodeExecutionStack(
	graph: DirectedGraph,
	// TODO: turn this into StartNodeData from utils
	startNodes: StartNodeData[],
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

	// The start nodes's sources need to have run data or pinned data. If they
	// don't then they should not be the start nodes, but some node before them
	// should be. Probably they are not coming from findStartNodes, make sure to
	// use that function to get the start nodes.
	for (const startNode of startNodes) {
		if (startNode.sourceData) {
			a.ok(
				runData[startNode.sourceData.previousNode.name] ||
					pinData[startNode.sourceData.previousNode.name],
				`Start nodes have sources that don't have run data. That is not supported. Make sure to get the start nodes by calling "findStartNodes". The node in question is "${startNode.node.name}" and their source is "${startNode.sourceData.previousNode.name}".`,
			);
		}
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
			.getDirectParents(startNode.node)
			.filter((c) => c.type === NodeConnectionType.Main);

		const incomingData: INodeExecutionData[][] = [];
		let incomingSourceData: ITaskDataConnectionsSource | null = null;

		if (incomingStartNodeConnections.length === 0) {
			incomingData.push([{ json: {} }]);
		} else {
			// Get the data of the incoming connections
			incomingSourceData = { main: [] };
			// TODO: Get rid of this whole loop. All data necessary to recreate the
			// stack should exist in sourceData. The only thing that is currently
			// missing is the inputIndex and that's the sole reason why we iterate
			// over all incoming connections.
			for (const connection of incomingStartNodeConnections) {
				if (connection.from.name !== startNode.sourceData?.previousNode.name) {
					continue;
				}

				const node = connection.from;

				a.equal(startNode.sourceData.previousNode, node);

				if (pinData[node.name]) {
					incomingData.push(pinData[node.name]);
				} else {
					a.ok(
						runData[connection.from.name],
						`Start node(${startNode.node.name}) has an incoming connection with no run or pinned data. This is not supported. The connection in question is "${connection.from.name}->${connection.to.name}". Are you sure the start nodes come from the "findStartNodes" function?`,
					);

					const nodeIncomingData = getIncomingData(
						runData,
						connection.from.name,
						runIndex,
						connection.type,
						connection.inputIndex,
					);

					if (nodeIncomingData) {
						incomingData.push(nodeIncomingData);
					}
				}

				incomingSourceData.main.push({
					...startNode.sourceData,
					previousNode: startNode.sourceData.previousNode.name,
				});
			}
		}

		const executeData: IExecuteData = {
			node: startNode.node,
			data: { main: incomingData },
			source: incomingSourceData,
		};

		nodeExecutionStack.push(executeData);

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
