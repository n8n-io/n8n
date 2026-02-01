import type { IRunData } from 'n8n-workflow';

/**
 * Calculates the next execution index by finding the highest existing index in the run data and incrementing by 1.
 *
 * The execution index is used to track the sequence of workflow executions.
 *
 * @param {IRunData} [runData={}]
 * @returns {number} The next execution index (previous highest index + 1, or 0 if no previous executionIndex exist).
 */
export function getNextExecutionIndex(runData: IRunData = {}): number {
	// If runData is empty, return 0 as the first execution index
	if (!runData || Object.keys(runData).length === 0) return 0;

	const previousIndices = Object.values(runData)
		.flat()
		.map((taskData) => taskData.executionIndex)
		// filter out undefined if previous execution does not have index
		// this can happen if rerunning execution before executionIndex was introduced
		.filter((value) => typeof value === 'number');

	// If no valid indices were found, return 0 as the first execution index
	if (previousIndices.length === 0) return 0;

	return Math.max(...previousIndices) + 1;
}
