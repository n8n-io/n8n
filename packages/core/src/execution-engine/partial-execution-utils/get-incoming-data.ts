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

/** The engine does not send an output without items to the next node. */
function carriesItems(data: INodeExecutionData[] | null): data is INodeExecutionData[] {
	return data !== null && data.length > 0;
}

/**
 * Returns the items that the source node sends through `connection`, and the
 * run index of the source node that sent them. Returns `undefined` if the
 * connection carries no items.
 *
 * - If the source node has pinned data, the function ignores its run data.
 *   The pinned items count only for the first main output, with run index 0.
 * - If not, the function uses the first run that has items on the output.
 *
 * Partial executions use this function to give a node the same inputs that a
 * full execution gives it. The pinned-data rule copies
 * `WorkflowExecute.getPinnedOutput`, but it does not check if the node is
 * disabled. Partial executions remove disabled nodes before they call it.
 */
export function getIncomingDataForConnection(
	connection: Pick<GraphConnection, 'from' | 'type' | 'outputIndex'>,
	runData: IRunData,
	pinData: IPinData,
): { data: INodeExecutionData[]; runIndex: number } | undefined {
	const nodeName = connection.from.name;
	const pinnedData = pinData[nodeName];

	if (pinnedData !== undefined) {
		const isFirstMainOutput =
			connection.type === NodeConnectionTypes.Main && connection.outputIndex === 0;

		return isFirstMainOutput && carriesItems(pinnedData)
			? { data: pinnedData, runIndex: 0 }
			: undefined;
	}

	const runCount = runData[nodeName]?.length ?? 0;
	for (let runIndex = 0; runIndex < runCount; runIndex++) {
		const data = getIncomingData(
			runData,
			nodeName,
			runIndex,
			connection.type,
			connection.outputIndex,
		);

		if (carriesItems(data)) {
			return { data, runIndex };
		}
	}

	return undefined;
}
