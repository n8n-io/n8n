import type { ClaimedTask } from '../types';

/**
 * How firing one claimed task ended.
 *
 * - `completed`: the handler ran successfully and the task was marked done.
 * - `rescheduled`: the handler failed; the task will be retried later.
 * - `dead-lettered`: the handler failed on its last allowed attempt; the task
 *   is now permanently failed.
 * - `skipped-no-handler`: no handler is registered for the task's type; the
 *   claim was released so another instance can pick the task up.
 * - `skipped-not-owned`: the task row was deleted or taken over by another
 *   instance. Either nothing ran, or the handler did run but this instance no
 *   longer owned the task when it tried to record the result.
 *
 * `errorMessage` is present whenever the handler ran and failed, including a
 * `skipped-not-owned` fire whose failure could not be recorded.
 */
export type FireResult =
	| { outcome: 'completed' | 'skipped-no-handler' | 'skipped-not-owned' }
	| { outcome: 'rescheduled' | 'dead-lettered' | 'skipped-not-owned'; errorMessage: string };

/**
 * Lets an observer wrap the execution of one fire, typically to record a
 * tracing span around it (see `createExecutorTracing` in `observability/`).
 *
 * An implementation must call `run()` (which performs the actual fire),
 * return its result unchanged, and let any error thrown by `run()` propagate.
 */
export interface ExecutorTracing {
	/**
	 * Called once per fired task.
	 *
	 * @param host - Identity of the instance firing the task.
	 * @param task - The claimed task being fired.
	 * @param run - Performs the fire and resolves with its result.
	 * @returns The result `run` resolved with, unchanged.
	 */
	fire(host: string, task: ClaimedTask, run: () => Promise<FireResult>): Promise<FireResult>;
}

/** Default implementation: runs the fire and records nothing. */
export const noopExecutorTracing: ExecutorTracing = {
	fire: async (_host, _task, run) => await run(),
};
