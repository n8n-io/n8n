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
