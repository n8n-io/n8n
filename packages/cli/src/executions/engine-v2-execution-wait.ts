import type { ExecutionStatus } from '@n8n/engine';
import { sleep } from '@n8n/utils/sleep';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

/** Statuses after which the data plane writes nothing more for the run. */
const TERMINAL_STATUSES = new Set<ExecutionStatus>(['completed', 'failed', 'cancelled']);

const DEFAULT_POLL_INTERVAL_MS = 500;

export type EngineV2WaitOutcome = { kind: 'settled' } | { kind: 'timeout' } | { kind: 'missing' };

/**
 * Waits for an engine v2 execution to settle. A v2 run is never in
 * `ActiveExecutions`, and the data plane is the only place that knows when it
 * settled, so this polls it. On timeout the run is cancelled there: an abandoned
 * run keeps writing to the user's systems after the caller moved on.
 */
export async function waitForEngineV2Execution(args: {
	dataPlane: Pick<EngineDataPlaneProxyService, 'getExecution' | 'cancelExecution'>;
	executionId: ExecutionIdV2;
	timeoutMs: number;
	pollIntervalMs?: number;
}): Promise<EngineV2WaitOutcome> {
	const { dataPlane, executionId, timeoutMs } = args;
	const pollIntervalMs = args.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
	const deadline = Date.now() + timeoutMs;

	while (true) {
		const snapshot = await dataPlane.getExecution(executionId, { includeSteps: false });
		if (!snapshot) return { kind: 'missing' };
		if (TERMINAL_STATUSES.has(snapshot.status)) return { kind: 'settled' };

		if (Date.now() >= deadline) {
			await dataPlane.cancelExecution(executionId);
			return { kind: 'timeout' };
		}

		await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
	}
}
