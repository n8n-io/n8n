import type { INodeExecutionData, IRunData, NodeConnectionType } from 'n8n-workflow';

export function getIncomingData(
	runData: IRunData,
	nodeName: string,
	runIndex: number,
	connectionType: NodeConnectionType,
	outputIndex: number,
): INodeExecutionData[] | null {
	return runData[nodeName]?.at(runIndex)?.data?.[connectionType].at(outputIndex) ?? null;
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
