import type { IRun, IWorkflowSettings } from 'n8n-workflow';

/** Minutes a run saved: the workflow setting, or the sum of SavedTime nodes in dynamic mode. */
export function computeTimeSavedMinutes(settings: IWorkflowSettings | undefined, runData: IRun) {
	if (settings?.timeSavedMode !== 'dynamic') return settings?.timeSavedPerExecution ?? 0;

	let totalMinutes = 0;
	const resultData = runData.data.resultData?.runData ?? {};
	for (const nodeName in resultData) {
		for (const taskDataEntry of resultData[nodeName]) {
			if (taskDataEntry?.metadata?.timeSaved) {
				totalMinutes += taskDataEntry.metadata.timeSaved.minutes;
			}
		}
	}
	return totalMinutes;
}
