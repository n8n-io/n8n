import { sleep } from '@n8n/utils/sleep';
import { ManualExecutionCancelledError, TimeoutExecutionCancelledError } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';

/**
 * Waits for an instance-AI execution, with a timeout and an abort signal.
 *
 * Shared by `run` and `runStep` on the execution adapter. Both must cancel the
 * execution when they stop waiting: an abandoned run keeps a worker busy and
 * keeps writing to the user's systems after the agent moved on.
 */

export type ExecutionWaitOutcome =
	| { kind: 'completed' }
	| { kind: 'cancelled'; reason: 'timeout' | 'abort'; message: string };

export async function waitForInstanceAiExecution(args: {
	activeExecutions: ActiveExecutions;
	executionId: string;
	timeoutMs: number;
	abortSignal?: AbortSignal;
}): Promise<ExecutionWaitOutcome> {
	const { activeExecutions, executionId, timeoutMs, abortSignal } = args;

	// Already finished between start and now — nothing to wait for.
	if (!activeExecutions.has(executionId)) return { kind: 'completed' };

	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`Execution timed out after ${timeoutMs}ms`));
		}, timeoutMs);
	});

	let onAbort: (() => void) | undefined;
	const abortPromise =
		abortSignal === undefined
			? undefined
			: new Promise<never>((_, reject) => {
					onAbort = () => {
						const error = new Error(
							typeof abortSignal.reason === 'string'
								? abortSignal.reason
								: 'This operation was aborted',
						);
						error.name = 'AbortError';
						reject(error);
					};
					if (abortSignal.aborted) {
						onAbort();
						return;
					}
					abortSignal.addEventListener('abort', onAbort, { once: true });
				});

	try {
		await Promise.race([
			activeExecutions.getPostExecutePromise(executionId),
			timeoutPromise,
			...(abortPromise ? [abortPromise] : []),
		]);
		return { kind: 'completed' };
	} catch (error) {
		const isTimeout = error instanceof Error && error.message.includes('timed out');
		const isAbort =
			error instanceof Error && (error.name === 'AbortError' || abortSignal?.aborted === true);

		if (!isTimeout && !isAbort) throw error;

		try {
			activeExecutions.stopExecution(
				executionId,
				isAbort
					? new ManualExecutionCancelledError(executionId)
					: new TimeoutExecutionCancelledError(executionId),
			);
		} catch {
			// Execution may have completed between timeout/abort and cancel
		}

		return {
			kind: 'cancelled',
			reason: isAbort ? 'abort' : 'timeout',
			message: isAbort
				? 'Execution was cancelled'
				: `Execution timed out after ${timeoutMs}ms and was cancelled`,
		};
	} finally {
		clearTimeout(timeoutId);
		if (onAbort) abortSignal?.removeEventListener('abort', onAbort);
	}
}

export const ENGINE_V2_POLL_INTERVAL_MS = 250;

/**
 * Whether an engine v2 execution can still change, by its v1 status. A waiting
 * run counts as settled, as in v1: it leaves `ActiveExecutions` when it waits.
 */
export const isEngineV2ExecutionUnsettled = (status: string | undefined) =>
	status === 'new' || status === 'running';

/**
 * Polls an engine v2 execution until it settles, the time runs out, or the
 * signal aborts. A v2 run never registers in `ActiveExecutions`, and the engine
 * sends the control plane no end-of-run signal, so polling is the only option.
 *
 * `readStatus` returns `undefined` when the execution is not (yet) readable.
 * The poll continues until the timeout in that case. A read that is still
 * pending when the time runs out or the signal aborts does not hold up the
 * result.
 */
export async function pollEngineV2Execution(args: {
	readStatus: () => Promise<string | undefined>;
	timeoutMs: number;
	abortSignal?: AbortSignal;
}): Promise<'settled' | 'timeout' | 'abort'> {
	const { readStatus, timeoutMs, abortSignal } = args;
	const deadline = Date.now() + timeoutMs;

	while (true) {
		const status = await readStatusUntil(readStatus, deadline, abortSignal);
		if (typeof status === 'string' && !isEngineV2ExecutionUnsettled(status)) return 'settled';
		if (abortSignal?.aborted) return 'abort';
		if (Date.now() >= deadline) return 'timeout';

		try {
			await sleep(Math.min(ENGINE_V2_POLL_INTERVAL_MS, deadline - Date.now()), abortSignal);
		} catch {
			// An abort ends the sleep early. The next pass reports it.
		}
	}
}

const READ_ABANDONED = Symbol('read abandoned');

/**
 * Reads the status, but gives up when the deadline passes or the signal aborts.
 * The data plane client has no request timeout, so a stalled read would
 * otherwise keep the wait, and the run, going.
 */
async function readStatusUntil(
	readStatus: () => Promise<string | undefined>,
	deadline: number,
	abortSignal?: AbortSignal,
): Promise<string | undefined | typeof READ_ABANDONED> {
	const read = readStatus();
	// An abandoned read can still reject later. Nothing waits for it then.
	read.catch(() => {});

	let timeoutId: NodeJS.Timeout | undefined;
	let onAbort: (() => void) | undefined;
	const giveUp = new Promise<typeof READ_ABANDONED>((resolve) => {
		if (abortSignal?.aborted) {
			resolve(READ_ABANDONED);
			return;
		}
		timeoutId = setTimeout(() => resolve(READ_ABANDONED), Math.max(0, deadline - Date.now()));
		onAbort = () => resolve(READ_ABANDONED);
		abortSignal?.addEventListener('abort', onAbort, { once: true });
	});

	try {
		return await Promise.race([read, giveUp]);
	} finally {
		clearTimeout(timeoutId);
		if (onAbort) abortSignal?.removeEventListener('abort', onAbort);
	}
}

/**
 * Waits for an engine v2 execution that the adapter started. It stops the run
 * on a timeout or an abort, as {@link waitForInstanceAiExecution} does for v1.
 */
export async function waitForEngineV2Execution(args: {
	readStatus: () => Promise<string | undefined>;
	stop: () => Promise<void>;
	timeoutMs: number;
	abortSignal?: AbortSignal;
}): Promise<ExecutionWaitOutcome> {
	const { stop, timeoutMs } = args;
	const outcome = await pollEngineV2Execution(args);
	if (outcome === 'settled') return { kind: 'completed' };

	try {
		await stop();
	} catch {
		// The run can settle between the last read and the stop.
	}

	return {
		kind: 'cancelled',
		reason: outcome,
		message:
			outcome === 'abort'
				? 'Execution was cancelled'
				: `Execution timed out after ${timeoutMs}ms and was cancelled`,
	};
}
