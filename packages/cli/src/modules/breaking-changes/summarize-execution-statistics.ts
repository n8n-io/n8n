import type { WorkflowStatistics } from '@n8n/db';

export interface ExecutionSummary {
	numberOfExecutions: number;
	lastExecutedAt?: Date;
}

/**
 * Folds a workflow's statistics rows into the two figures the report shows.
 * The scan and the finding table reads both use it, so their numbers stay equal.
 */
export function summarizeExecutionStatistics(statistics: WorkflowStatistics[]): ExecutionSummary {
	let numberOfExecutions = 0;
	let lastExecutedAt: Date | undefined;
	for (const statistic of statistics) {
		numberOfExecutions += statistic.count || 0;
		if (!lastExecutedAt || statistic.latestEvent > lastExecutedAt) {
			lastExecutedAt = statistic.latestEvent;
		}
	}
	return { numberOfExecutions, lastExecutedAt };
}
