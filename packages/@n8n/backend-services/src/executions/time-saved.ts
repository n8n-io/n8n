import type { IRunData, IWorkflowSettings, WorkflowExecuteMode } from 'n8n-workflow';

import type { LedgerOutcome } from './counting-rules';

export function sumNodeTimeSavedMinutes(runData: IRunData | undefined): number {
	let totalMinutes = 0;
	for (const taskDataList of Object.values(runData ?? {})) {
		for (const taskData of taskDataList) {
			totalMinutes += taskData?.metadata?.timeSaved?.minutes ?? 0;
		}
	}
	return totalMinutes;
}

/**
 * Minutes a finished run saved. Undefined when the run cannot save time:
 * it did not succeed, or it is an error workflow (operational, not productive work).
 */
export function computeTimeSavedMinutes(run: {
	settings?: Pick<IWorkflowSettings, 'timeSavedMode' | 'timeSavedPerExecution'>;
	mode: WorkflowExecuteMode;
	outcome: LedgerOutcome;
	/** Sum the queue worker already took from the run data. */
	nodeTimeSavedMinutes?: number;
	runData?: IRunData;
}): number | undefined {
	if (run.outcome !== 'success' || run.mode === 'error') return undefined;

	// Legacy workflows have no time saved mode and use the fixed value.
	if (run.settings?.timeSavedMode !== 'dynamic') {
		return run.settings?.timeSavedPerExecution ?? 0;
	}

	return run.nodeTimeSavedMinutes ?? sumNodeTimeSavedMinutes(run.runData);
}
