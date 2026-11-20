import type { IRunExecutionData } from 'n8n-workflow';

/**
 * Holds the run data of the last sub-execution until one read.
 * One entry at most, so that a caller of many sub-executions does not keep all their run data.
 */
export class LastSubExecutionRunData {
	private entry?: { executionId: string; runExecutionData: IRunExecutionData };

	/** Replaces the entry. No run data clears the entry. */
	keep(executionId: string, runExecutionData: IRunExecutionData | undefined) {
		this.entry = runExecutionData ? { executionId, runExecutionData } : undefined;
	}

	/** Returns the run data of the given sub-execution and clears the entry. */
	take(executionId: string): IRunExecutionData | undefined {
		const { entry } = this;
		if (entry?.executionId === executionId) {
			this.entry = undefined;
			return entry.runExecutionData;
		}
		return undefined;
	}
}
