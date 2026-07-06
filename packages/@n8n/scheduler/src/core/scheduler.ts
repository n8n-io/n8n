import type { TaskHandler } from './executor';
import type { MaterializerSummary } from './materializer';
import type { ReapResult } from './reaper';
import type { RetentionSummary } from './retention';
import type { ClaimedTask } from './types';

/**
 * The package's contract: everything a composed scheduler does.
 */
export interface Scheduler {
	/**
	 * Register the handler that runs tasks of `taskType`. The executor claims
	 * only registered types, so an instance never picks up work it cannot run.
	 */
	registerTaskHandler(taskType: string, handler: TaskHandler): void;

	/** One materializer pass: record upcoming occurrences of due jobs as tasks. */
	materialize(): Promise<MaterializerSummary>;

	/**
	 * One executor tick: claim the due tasks this instance can run and schedule
	 * each to fire at its `runAt`. Returns the claimed tasks.
	 */
	execute(): Promise<ClaimedTask[]>;

	/** One reaper sweep: recover tasks stranded by an expired lease. */
	reap(): Promise<ReapResult>;

	/** One retention pass: delete finished tasks past their windows. */
	prune(): Promise<RetentionSummary>;

	/** Cancel unfired timers and release their claims (shutdown). */
	stop(): Promise<void>;
}
