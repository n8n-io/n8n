import type { ExecutionStatus } from '@n8n/engine';
import { sleep } from '@n8n/utils/sleep';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import type { ExecutionWaitOutcome } from './instance-ai-execution-wait';

/** Statuses after which the data plane writes nothing more for the run. */
const TERMINAL_STATUSES = new Set<ExecutionStatus>(['completed', 'failed', 'cancelled']);

const DEFAULT_POLL_INTERVAL_MS = 500;

/**
 * Waits for an engine v2 execution the way `waitForInstanceAiExecution` waits
 * for a v1 one. A v2 run is never in `ActiveExecutions`, and the data plane is
 * the only place that knows when it settled, so this polls it. On timeout or
 * abort the run is cancelled there, for the same reason the v1 wait cancels:
 * an abandoned run keeps writing to the user's systems after the agent moved on.
 */
export async function waitForEngineV2Execution(args: {
	dataPlane: EngineDataPlaneProxyService;
	executionId: string;
	timeoutMs: number;
	abortSignal?: AbortSignal;
	pollIntervalMs?: number;
}): Promise<ExecutionWaitOutcome> {
	const { dataPlane, executionId, timeoutMs, abortSignal } = args;
	const pollIntervalMs = args.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
	const deadline = Date.now() + timeoutMs;
	// Only this module's callers mint the id, through the dispatcher, so the shape holds.
	const id = executionId as ExecutionIdV2;

	while (true) {
		if (abortSignal?.aborted) {
			await dataPlane.cancelExecution(id);
			return { kind: 'cancelled', reason: 'abort', message: 'Execution was cancelled' };
		}

		const snapshot = await dataPlane.getExecution(id);
		// A run the data plane no longer has cannot be waited on; the read that
		// follows reports it as unknown.
		if (!snapshot || TERMINAL_STATUSES.has(snapshot.status)) return { kind: 'completed' };

		if (Date.now() >= deadline) {
			await dataPlane.cancelExecution(id);
			return {
				kind: 'cancelled',
				reason: 'timeout',
				message: `Execution timed out after ${timeoutMs}ms and was cancelled`,
			};
		}

		try {
			await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())), abortSignal);
		} catch {
			// An abort cuts the sleep short; the next pass cancels the run.
		}
	}
}
