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

export function addWaitingExecution(
	waitingExecution: IWaitingForExecution,
	nodeName: string,
	runIndex: number,
	inputType: NodeConnectionType,
	inputIndex: number,
	executionData: INodeExecutionData[] | null,
) {
	const waitingExecutionObject = waitingExecution[nodeName] ?? {};
	const taskDataConnections = waitingExecutionObject[runIndex] ?? {};
	const executionDataList = taskDataConnections[inputType] ?? [];

	executionDataList[inputIndex] = executionData;

	taskDataConnections[inputType] = executionDataList;
	waitingExecutionObject[runIndex] = taskDataConnections;
	waitingExecution[nodeName] = waitingExecutionObject;
}

export function addWaitingExecutionSource(
	waitingExecutionSource: IWaitingForExecutionSource,
	nodeName: string,
	runIndex: number,
	inputType: NodeConnectionType,
	inputIndex: number,
	sourceData: ISourceData | null,
) {
	const waitingExecutionSourceObject = waitingExecutionSource[nodeName] ?? {};
	const taskDataConnectionsSource = waitingExecutionSourceObject[runIndex] ?? {};
	const sourceDataList = taskDataConnectionsSource[inputType] ?? [];

	sourceDataList[inputIndex] = sourceData;

	taskDataConnectionsSource[inputType] = sourceDataList;
	waitingExecutionSourceObject[runIndex] = taskDataConnectionsSource;
	waitingExecutionSource[nodeName] = waitingExecutionSourceObject;
}

// TODO: What about paired items?
// TODO: clean up this function. It's too complex.
/**
 * Recreates the node execution stack, waiting executions and waiting
 * execution sources from a directed graph, start nodes, the destination node,
 * run and pinned data.
 *
 * This function aims to be able to recreate the internal state of the
 * WorkflowExecute class at any point of time during an execution based on the
 * data that is already available. Specifically it will recreate the
 * `WorkflowExecute.runExecutionData.executionData` properties.
 *
 * This allows "restarting" an execution and having it only execute what's
 * necessary to be able to execute the destination node accurately, e.g. as
 * close as possible to what would happen in a production execution.
 */
// eslint-disable-next-line complexity
export function recreateNodeExecutionStack(
	graph: DirectedGraph,
	startNodes: INode[],
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

			console.log(
				'sourceDataSets',
				sourceDataSets
					.map((group) => group.connections.map((c) => `${c.from.name} - ${c.to.name}`))
					.join('; '),
			);

			for (const sourceData of sourceDataSets) {
				if (sourceData.complete) {
					// All incoming connections have data, so let's put the node on the
					// stack!
					incomingData = [];

					incomingSourceData = { main: [] };

					for (const incomingConnection of sourceData.connections) {
						const sourceNode = incomingConnection.from;

						if (pinData[sourceNode.name]) {
							incomingData.push(pinData[sourceNode.name]);
						} else {
							a.ok(
								runData[sourceNode.name],
								`Start node(${incomingConnection.to.name}) has an incoming connection with no run or pinned data. This is not supported. The connection in question is "${sourceNode.name}->${startNode.name}". Are you sure the start nodes come from the "findStartNodes" function?`,
							);

							const nodeIncomingData = getIncomingData(
								runData,
								sourceNode.name,
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
				} else {
					const nodeName = startNode.name;

					for (const incomingConnection of sourceData.connections) {
						const sourceNode = incomingConnection.from;
						const nodeIncomingData = getIncomingData(
							runData,
							sourceNode.name,
							runIndex,
							incomingConnection.type,
							incomingConnection.outputIndex,
						);

						addWaitingExecution(
							waitingExecution,
							nodeName,
							runIndex,
							incomingConnection.type,
							incomingConnection.inputIndex,
							nodeIncomingData ?? null,
						);

						addWaitingExecutionSource(
							waitingExecutionSource,
							nodeName,
							runIndex,
							incomingConnection.type,
							incomingConnection.inputIndex,
							nodeIncomingData
								? {
										previousNode: incomingConnection.from.name,
										previousNodeRun: runIndex,
										previousNodeOutput: incomingConnection.outputIndex,
									}
								: null,
						);
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
