import type { IRunData } from 'n8n-workflow';

export function sumNodeTimeSavedMinutes(runData: IRunData | undefined): number {
	let totalMinutes = 0;
	for (const taskDataList of Object.values(runData ?? {})) {
		for (const taskData of taskDataList) {
			totalMinutes += taskData?.metadata?.timeSaved?.minutes ?? 0;
		}
	}
	return totalMinutes;
}
