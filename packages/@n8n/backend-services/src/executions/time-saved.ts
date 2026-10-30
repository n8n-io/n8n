import type { IRunData, IWorkflowSettings } from 'n8n-workflow';

import { savesTime, type LedgerFact } from './counting-rules';

export function sumNodeTimeSavedMinutes(runData: IRunData | undefined): number {
	let totalMinutes = 0;
	for (const taskDataList of Object.values(runData ?? {})) {
		for (const taskData of taskDataList) {
			totalMinutes += taskData?.metadata?.timeSaved?.minutes ?? 0;
		}
	}
	return totalMinutes;
}

/** Minutes a finished run saved. Undefined when `savesTime` excludes the run. */
export function computeTimeSavedMinutes(run: {
	fact: LedgerFact;
	settings?: Pick<IWorkflowSettings, 'timeSavedMode' | 'timeSavedPerExecution'>;
	/** Sum the queue worker already took from the run data. */
	nodeTimeSavedMinutes?: number;
	runData?: IRunData;
}): number | undefined {
	if (!savesTime(run.fact)) return undefined;

	// Legacy workflows have no time saved mode and use the fixed value.
	if (run.settings?.timeSavedMode !== 'dynamic') {
		return run.settings?.timeSavedPerExecution ?? 0;
	}

	return run.nodeTimeSavedMinutes ?? sumNodeTimeSavedMinutes(run.runData);
}
