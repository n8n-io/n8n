import type { EngineLogger } from '../logging';
import { createConsoleLogger } from '../logging';
import type { StepMessage, WorkQueue } from '../queue';
import type { DueStep, StepStore } from './step-store';

/** v1 resolves waits on a 60-second poll, so timer resolution matches it. */
export const DEFAULT_WAIT_SWEEP_INTERVAL_MS = 60_000;

/** Enough that a backlog drains in a few sweeps, few enough to bound one update. */
export const DEFAULT_WAIT_SWEEP_BATCH_SIZE = 500;

/**
 * Fires the waits whose deadline has passed.
 *
 * The only transition no event triggers: a deadline arrives because time
 * passed, so something has to look. Each sweep resumes the due steps and
 * announces them, after which they take the ordinary worker path — the sweep
 * knows nothing about what a wait means, only that this one is over.
 *
 * Sweeps do not overlap: the next is scheduled once the current one settles,
 * so a slow database stretches the interval rather than stacking sweeps.
 */
export class WaitSweeper {
	private timer: NodeJS.Timeout | undefined;
	private stopped = false;
	/** The sweep in flight, so `stop` can wait for it to settle. */
	private sweeping: Promise<void> | undefined;

	constructor(
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
		private readonly logger: EngineLogger = createConsoleLogger(),
		private readonly intervalMs: number = DEFAULT_WAIT_SWEEP_INTERVAL_MS,
		private readonly batchSize: number = DEFAULT_WAIT_SWEEP_BATCH_SIZE,
	) {}

	start(): void {
		this.arm();
	}

	async stop(): Promise<void> {
		this.stopped = true;
		if (this.timer) clearTimeout(this.timer);
		this.timer = undefined;
		// A sweep mid-flight has already resumed rows; let it announce them.
		await this.sweeping;
	}

	private arm(): void {
		if (this.stopped) return;

		this.timer = setTimeout(() => {
			this.sweeping = this.sweep().finally(() => {
				this.sweeping = undefined;
				this.arm();
			});
		}, this.intervalMs);
		// Unref'd: a pending sweep must not hold the process open.
		this.timer.unref();
	}

	/**
	 * One pass. Never throws: a failed sweep must not stop the next one.
	 *
	 * Resume first, announce second. The other order would announce a step still
	 * `waiting`, whose claim then refuses it and loses the resume for good — so
	 * TODO(CAT-2938): a crash between the two strands these rows `queued` with
	 * nothing dispatching them, which is the same state an unannounced planned
	 * step leaves behind and the same re-announcement recovers.
	 */
	private async sweep(): Promise<void> {
		let due: DueStep[];
		try {
			due = await this.stepStore.resumeDueSteps(new Date(), this.batchSize);
		} catch (error) {
			this.logger.error('engine: wait sweep failed to resume due waits', { error });
			return;
		}

		for (const { id: stepId, executionId } of due) {
			try {
				await this.stepQueue.publish({ type: 'step:ready', executionId, stepId });
			} catch (error) {
				// The row is already `queued`, so a lost announcement strands this one
				// step for reconciliation (CAT-2938). Its batch carries on.
				this.logger.error('engine: wait sweep failed to announce a resumed step', {
					error,
					executionId,
					stepId,
				});
			}
		}
	}
}
