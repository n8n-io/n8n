import type { IRunData } from 'n8n-workflow';

export function getNextExecutionIndex(runData: IRunData | undefined) {
	const previousRuns = Object.values(runData ?? {})
		.flat()
		.map((taskData) => taskData.executionIndex)
		// filter out undefined if previous execution does not have index
		// this can happen if rerunning execution before executionIndex was introduced
		.filter((value) => typeof value === 'number');
	const maxExecutionIndex = previousRuns.length ? Math.max(...previousRuns) : undefined;

	return typeof maxExecutionIndex === 'number' ? maxExecutionIndex + 1 : undefined;
}
