import type { InstanceAiRunDebugResponse } from '@n8n/api-types';
import pLimit from 'p-limit';

import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';

const RUN_FETCH_CONCURRENCY = 4;

/** Hard deadline for the whole capture. The per-case cleanup path awaits this
 *  before deleting the thread, so a stalled debug endpoint would otherwise
 *  block that row — and with it the run — indefinitely. */
const CAPTURE_DEADLINE_MS = 60_000;

/** Per-request abort so a stalled call releases its socket instead of running
 *  on after the outer deadline resolves the race. */
const REQUEST_TIMEOUT_MS = 20_000;

export async function captureThreadRunDebug(
	client: N8nClient,
	threadId: string,
	logger?: EvalLogger,
): Promise<InstanceAiRunDebugResponse[]> {
	let deadline: NodeJS.Timeout | undefined;
	const timedOut = new Promise<InstanceAiRunDebugResponse[]>((resolve) => {
		deadline = setTimeout(() => {
			logger?.warn(
				`  Run debug capture timed out for thread ${threadId} after ${String(CAPTURE_DEADLINE_MS)}ms`,
			);
			resolve([]);
		}, CAPTURE_DEADLINE_MS);
		// Best-effort capture must never keep the process alive on its own.
		deadline.unref?.();
	});

	try {
		return await Promise.race([captureAllRuns(client, threadId, logger), timedOut]);
	} finally {
		if (deadline) clearTimeout(deadline);
	}
}

async function captureAllRuns(
	client: N8nClient,
	threadId: string,
	logger?: EvalLogger,
): Promise<InstanceAiRunDebugResponse[]> {
	try {
		const response = await client.listThreadDebugRuns(threadId, REQUEST_TIMEOUT_MS);
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
							const record = await client.getRunDebug(summary.runId, REQUEST_TIMEOUT_MS);
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
