import type { InstanceAiRunDebugResponse } from '@n8n/api-types';
import pLimit from 'p-limit';

import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';

const RUN_FETCH_CONCURRENCY = 4;

export async function captureThreadRunDebug(
	client: N8nClient,
	threadId: string,
	logger?: EvalLogger,
): Promise<InstanceAiRunDebugResponse[]> {
	try {
		const response = await client.listThreadDebugRuns(threadId);
		const runs = response.runs ?? [];
		if (runs.length === 0) {
			logger?.verbose(`  No run debug records for thread ${threadId}`);
			return [];
		}

		const limit = pLimit(RUN_FETCH_CONCURRENCY);
		const records = await Promise.all(
			runs.map(
				async (summary) =>
					await limit(async (): Promise<InstanceAiRunDebugResponse | null> => {
						try {
							const record = await client.getRunDebug(summary.runId);
							return summary.label ? { ...record, label: summary.label } : record;
						} catch (error: unknown) {
							logger?.warn(
								`  Run debug fetch failed for ${summary.runId}: ${error instanceof Error ? error.message : String(error)}`,
							);
							return null;
						}
					}),
			),
		);

		return records
			.filter((record): record is InstanceAiRunDebugResponse => record !== null)
			.sort((a, b) => a.startedAt - b.startedAt);
	} catch (error: unknown) {
		logger?.warn(
			`  Run debug capture skipped for thread ${threadId}: ${error instanceof Error ? error.message : String(error)}`,
		);
		return [];
	}
}
