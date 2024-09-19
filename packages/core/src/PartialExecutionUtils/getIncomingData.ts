import * as a from 'assert';
import type { INodeExecutionData, IRunData, NodeConnectionType } from 'n8n-workflow';

export function getIncomingData(
	runData: IRunData,
	nodeName: string,
	runIndex: number,
	connectionType: NodeConnectionType,
	outputIndex: number,
): INodeExecutionData[] | null | undefined {
	a.ok(runData[nodeName], `Can't find node with name '${nodeName}' in runData.`);
	a.ok(
		runData[nodeName][runIndex],
		`Can't find a run for index '${runIndex}' for node name '${nodeName}'`,
	);
	a.ok(
		runData[nodeName][runIndex].data,
		`Can't find data for index '${runIndex}' for node name '${nodeName}'`,
	);

	return runData[nodeName][runIndex].data[connectionType][outputIndex];
}
