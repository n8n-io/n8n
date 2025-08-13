import type { IConnections, IExecuteData, IPinData, IRunData } from 'n8n-workflow';
import * as workflowUtils from 'n8n-workflow/common';
import { NodeConnectionTypes } from 'n8n-workflow';

export function executeDataImpl(
	connections: IConnections,
	parentNodes: string[],
	currentNode: string,
	inputName: string,
	runIndex: number,
	shouldReplaceInputDataWithPinData: boolean,
	pinData: IPinData | undefined,
	workflowRunData: IRunData | null,
	parentRunIndex?: number,
): IExecuteData {
	const connectionsByDestinationNode = workflowUtils.mapConnectionsByDestination(connections);

	const executeData = {
		node: {},
		data: {},
		source: null,
	} as IExecuteData;

	parentRunIndex = parentRunIndex ?? runIndex;

	// Find the parent node which has data
	for (const parentNodeName of parentNodes) {
		if (shouldReplaceInputDataWithPinData) {
			const parentPinData = pinData?.[parentNodeName];

			// populate `executeData` from `pinData`

			if (parentPinData) {
				executeData.data = { main: [parentPinData] };
				executeData.source = { main: [{ previousNode: parentNodeName }] };

				return executeData;
			}
		}

		// populate `executeData` from `runData`
		if (workflowRunData === null) {
			return executeData;
		}

		if (
			!workflowRunData[parentNodeName] ||
			workflowRunData[parentNodeName].length <= parentRunIndex ||
			!workflowRunData[parentNodeName][parentRunIndex] ||
			!workflowRunData[parentNodeName][parentRunIndex].hasOwnProperty('data') ||
			!workflowRunData[parentNodeName][parentRunIndex].data?.hasOwnProperty(inputName)
		) {
			executeData.data = {};
		} else {
			executeData.data = workflowRunData[parentNodeName][parentRunIndex].data!;
			if (workflowRunData[currentNode] && workflowRunData[currentNode][runIndex]) {
				executeData.source = {
					[inputName]: workflowRunData[currentNode][runIndex].source,
				};
			} else {
				let previousNodeOutput: number | undefined;
				// As the node can be connected through either of the outputs find the correct one
				// and set it to make pairedItem work on not executed nodes
				if (connectionsByDestinationNode[currentNode]?.main) {
					mainConnections: for (const mainConnections of connectionsByDestinationNode[currentNode]
						.main) {
						for (const connection of mainConnections ?? []) {
							if (
								connection.type === NodeConnectionTypes.Main &&
								connection.node === parentNodeName
							) {
								previousNodeOutput = connection.index;
								break mainConnections;
							}
						}
					}
				}

				// The current node did not get executed in UI yet so build data manually
				executeData.source = {
					[inputName]: [
						{
							previousNode: parentNodeName,
							previousNodeOutput,
							previousNodeRun: parentRunIndex,
						},
					],
				};
			}
			return executeData;
		}
	}

	return executeData;
}
