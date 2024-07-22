import type {
	IConnection,
	IExecuteData,
	INode,
	INodeConnections,
	INodeExecutionData,
	IPinData,
	IRunData,
	ISourceData,
	ITaskDataConnectionsSource,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	Workflow,
} from 'n8n-workflow';

import * as a from 'assert';
import { getIncomingData, StartNodeData } from './utils';

// eslint-disable-next-line @typescript-eslint/promise-function-async, complexity
export function recreateNodeExecutionStack(
	workflow: Workflow,
	// TODO: turn this into StartNodeData from utils
	startNodes: StartNodeData[],
	destinationNodeName: string,
	runData: IRunData,
	pinData: IPinData,
): {
	nodeExecutionStack: IExecuteData[];
	waitingExecution: IWaitingForExecution;
	waitingExecutionSource: IWaitingForExecutionSource;
} {
	// Initialize the nodeExecutionStack and waitingExecution with
	// the data from runData
	const nodeExecutionStack: IExecuteData[] = [];
	const waitingExecution: IWaitingForExecution = {};
	const waitingExecutionSource: IWaitingForExecutionSource = {};

	// TODO: Don't hard code this!
	const runIndex = 0;

	let incomingNodeConnections: INodeConnections | undefined;
	let connection: IConnection;

	for (const startNode of startNodes) {
		incomingNodeConnections = workflow.connectionsByDestinationNode[startNode.node.name];

		const incomingData: INodeExecutionData[][] = [];
		let incomingSourceData: ITaskDataConnectionsSource | null = null;

		if (incomingNodeConnections === undefined) {
			incomingData.push([{ json: {} }]);
		} else {
			a.ok(incomingNodeConnections.main, 'the main input group is defined');

			// Get the data of the incoming connections
			incomingSourceData = { main: [] };
			for (const connections of incomingNodeConnections.main) {
				for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
					connection = connections[inputIndex];

					if (connection.node !== startNode.sourceData?.previousNode.name) {
						continue;
					}

					const node = workflow.getNode(connection.node);

					a.ok(
						node,
						`Could not find node(${connection.node}). The node is referenced by the connection "${startNode.node.name}->${connection.node}".`,
					);

					a.notEqual(
						node.disabled,
						true,
						`Start node(${startNode.node.name}) has an incoming connection to a node that is disabled. This is not supported. The connection in question is "${startNode.node.name}->${connection.node}". Are you sure you called "findSubgraph2"?`,
					);

					if (pinData[node.name]) {
						incomingData.push(pinData[node.name]);
					} else {
						a.ok(
							runData[connection.node],
							`Start node(${startNode.node.name}) has an incoming connection with no run or pinned data. This is not supported. The connection in question is "${startNode.node.name}->${connection.node}". Are you sure the start nodes come from the "findStartNodes" function?`,
						);

						const nodeIncomingData = getIncomingData(
							runData,
							connection.node,
							runIndex,
							connection.type,
							connection.index,
						);

						if (nodeIncomingData) {
							incomingData.push(nodeIncomingData);
						}
					}

					incomingSourceData.main.push(
						// NOTE: `sourceData` cannot be null or undefined. This can only
						// happen if the startNode has no incoming connections, but we're
						// iterating over the incoming connections here.
						{
							...startNode.sourceData,
							previousNode: startNode.sourceData.previousNode.name,
						},
					);
				}
			}
		}

		const executeData: IExecuteData = {
			node: workflow.getNode(startNode.node.name) as INode,
			data: { main: incomingData },
			source: incomingSourceData,
		};

		nodeExecutionStack.push(executeData);

		if (destinationNodeName) {
			// Check if the destinationNode has to be added as waiting
			// because some input data is already fully available
			incomingNodeConnections = workflow.connectionsByDestinationNode[destinationNodeName];
			if (incomingNodeConnections !== undefined) {
				for (const connections of incomingNodeConnections.main) {
					for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
						connection = connections[inputIndex];

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

						if (runData[connection.node] !== undefined) {
							// Input data exists so add as waiting
							// incomingDataDestination.push(runData[connection.node!][runIndex].data![connection.type][connection.index]);
							waitingExecution[destinationNodeName][runIndex][connection.type].push(
								runData[connection.node][runIndex].data![connection.type][connection.index],
							);
							waitingExecutionSource[destinationNodeName][runIndex][connection.type].push({
								previousNode: connection.node,
								previousNodeOutput: connection.index || undefined,
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
	}

	return {
		nodeExecutionStack,
		waitingExecution,
		waitingExecutionSource,
	};
}
