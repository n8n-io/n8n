import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { ExecutionSummary } from 'n8n-workflow';

import type { EntityMetricsPatch, MetricsSource } from '../aquarium.types';
import { entityKey } from './source.utils';

/** The endpoint returns at most 100 executions for each request. */
const PAGE_SIZE = 100;
const MAX_PAGES = 3;

type ExecutionSample = Pick<
	ExecutionSummary,
	'id' | 'workflowId' | 'status' | 'startedAt' | 'stoppedAt'
>;

const FAILED_STATUSES = new Set(['error', 'crashed']);

export function toExecutionPatches(executions: ExecutionSample[]): EntityMetricsPatch[] {
	const byWorkflow = new Map<string, { count: number; failed: number; runTimes: number[] }>();

	for (const execution of executions) {
		const stats = byWorkflow.get(execution.workflowId) ?? { count: 0, failed: 0, runTimes: [] };
		stats.count++;
		if (FAILED_STATUSES.has(execution.status)) stats.failed++;
		if (execution.startedAt && execution.stoppedAt) {
			const runTime =
				new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
			if (runTime >= 0) stats.runTimes.push(runTime);
		}
		byWorkflow.set(execution.workflowId, stats);
	}

	return [...byWorkflow.entries()].map(([workflowId, stats]) => ({
		key: entityKey('workflow', workflowId),
		metrics: {
			executionCount: stats.count,
			failedCount: stats.failed,
			averageRunTimeMs: stats.runTimes.length
				? stats.runTimes.reduce((sum, value) => sum + value, 0) / stats.runTimes.length
				: 0,
		},
	}));
}

/** A sample of recent executions. It works without a license, but counts only the last few hundred. */
export const executionsSource: MetricsSource = {
	id: 'executions',
	async load({ restApiContext }) {
		const executions: ExecutionSample[] = [];
		let lastId: string | undefined;

		for (let page = 0; page < MAX_PAGES; page++) {
			const { results } = await makeRestApiRequest<{ results: ExecutionSample[] }>(
				restApiContext,
				'GET',
				'/executions',
				{ limit: PAGE_SIZE, ...(lastId ? { lastId } : {}) },
			);
			executions.push(...results);
			if (results.length < PAGE_SIZE) break;
			lastId = results[results.length - 1]?.id;
		}

		return toExecutionPatches(executions);
	},
};
