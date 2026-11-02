import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type IPinData,
	type IRunData,
	type NodeConnectionType,
} from 'n8n-workflow';

import type { GraphConnection } from './directed-graph';

export function getIncomingData(
	runData: IRunData,
	nodeName: string,
	runIndex: number,
	connectionType: NodeConnectionType,
	outputIndex: number,
): INodeExecutionData[] | null {
	return runData[nodeName]?.at(runIndex)?.data?.[connectionType]?.at(outputIndex) ?? null;
}

function getRunIndexLength(runData: IRunData, nodeName: string) {
	return runData[nodeName]?.length ?? 0;
}

export function getIncomingDataFromAnyRun(
	runData: IRunData,
	nodeName: string,
	connectionType: NodeConnectionType,
	outputIndex: number,
): { data: INodeExecutionData[]; runIndex: number } | undefined {
	const maxRunIndexes = getRunIndexLength(runData, nodeName);

	for (let runIndex = 0; runIndex < maxRunIndexes; runIndex++) {
		const data = getIncomingData(runData, nodeName, runIndex, connectionType, outputIndex);

		if (data && data.length > 0) {
			return { data, runIndex };
		}
	}

	return undefined;
}

/**
 * Returns the items that a full execution would send through this connection.
 *
 * Pinned data replaces the run data of a node. The engine emits it only on
 * the first main output (`WorkflowExecute.getPinnedOutput`). The engine does
 * not send an output without items to the next node.
 */
export function getIncomingDataForConnection(
	connection: Pick<GraphConnection, 'from' | 'type' | 'outputIndex'>,
	runData: IRunData,
	pinData: IPinData,
): { data: INodeExecutionData[]; runIndex: number } | undefined {
	const pinnedData = pinData[connection.from.name];

	if (pinnedData !== undefined) {
		const isFirstMainOutput =
			connection.type === NodeConnectionTypes.Main && connection.outputIndex === 0;

		return isFirstMainOutput && pinnedData.length > 0
			? { data: pinnedData, runIndex: 0 }
			: undefined;
	}

	return getIncomingDataFromAnyRun(
		runData,
		connection.from.name,
		connection.type,
		connection.outputIndex,
	);
}
