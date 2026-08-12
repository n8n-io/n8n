import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Labels attached to every log line emitted while an execution is running.
 * Deliberately tiny — this is read on every `Logger.log()` call.
 */
export type LogExecutionContext = {
	/**
	 * Absent until the execution has been registered — a run is entered knowing
	 * only its workflow, and the id is minted a moment later.
	 */
	executionId?: string;
	workflowId?: string;
};

const storage = new AsyncLocalStorage<LogExecutionContext>();

/**
 * Run `fn` with execution labels attached to every log line it produces,
 * including from promises, timers and most third-party callbacks it starts.
 *
 * Lines emitted from callbacks that escape the async context simply go
 * unlabelled — an accepted gap, not a correctness problem.
 *
 * Nesting is supported: the innermost context wins for the duration of `fn`.
 */
export function runWithExecutionContext<T>(context: LogExecutionContext, fn: () => T): T {
	return storage.run(context, fn);
}

/** The execution the current async context belongs to, if any. */
export function getExecutionContext(): LogExecutionContext | undefined {
	return storage.getStore();
}
