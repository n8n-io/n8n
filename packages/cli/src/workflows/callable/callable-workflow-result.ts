import type { INodeExecutionData, IRunData, ITaskData } from 'n8n-workflow';

/** Map an execution's raw status into the simplified status of a callable run. */
export function normaliseExecutionStatus(status: string | undefined): string {
	if (status === 'error' || status === 'crashed') return 'error';
	if (status === 'canceled') return 'canceled';
	if (status === 'running' || status === 'new') return 'running';
	if (status === 'waiting') return 'waiting';
	if (status === 'unknown') return 'unknown';
	return 'success';
}

/** Extract the items produced by the last run of a node. */
function outputItemsFromNodeRuns(nodeRuns: ITaskData[]): INodeExecutionData[] {
	const lastRun = nodeRuns[nodeRuns.length - 1];
	if (!lastRun?.data?.main) return [];
	return lastRun.data.main.flatMap((items) => items ?? []);
}

/** Build a map from node name to output items. Items keep their binary data. */
export function collectResultItems(
	runData: IRunData,
	allOutputs: boolean,
): Record<string, INodeExecutionData[]> {
	const nodeNames = allOutputs ? Object.keys(runData) : Object.keys(runData).slice(-1);
	const resultItems: Record<string, INodeExecutionData[]> = {};
	for (const nodeName of nodeNames) {
		const outputItems = outputItemsFromNodeRuns(runData[nodeName]);
		if (outputItems.length > 0) resultItems[nodeName] = outputItems;
	}
	return resultItems;
}

/** Map each node's output items to their JSON. */
export function toResultData(
	resultItems: Record<string, INodeExecutionData[]>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(resultItems).map(([nodeName, items]) => [
			nodeName,
			items.map((item) => item.json),
		]),
	);
}

/** Build the resultData map from an execution's runData. */
export function collectResultData(runData: IRunData, allOutputs: boolean): Record<string, unknown> {
	return toResultData(collectResultItems(runData, allOutputs));
}
