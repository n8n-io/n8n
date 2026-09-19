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

	/** The arm in flight, so `stop` can wait before it sets another timer. */
	private arming: Promise<void> | undefined;

	constructor(
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
		private readonly logger: EngineLogger = createConsoleLogger(),
		private readonly intervalMs: number = DEFAULT_WAIT_SWEEP_INTERVAL_MS,
		private readonly batchSize: number = DEFAULT_WAIT_SWEEP_BATCH_SIZE,
	) {}

	start(): void {
		this.rearm();
	}

	async stop(): Promise<void> {
		this.stopped = true;
		clearTimeout(this.timer);
		this.timer = undefined;
		// An arm mid-flight reads the database, so it outlives this call and would
		// set a timer after it returned. A sweep mid-flight has already resumed
		// rows; let it announce them.
		await this.arming;
		await this.sweeping;
	}

	private rearm(): void {
		this.arming = this.arm().finally(() => {
			this.arming = undefined;
		});
	}

	/**
	 * Schedules the next sweep, at the earlier of the interval and the next
	 * deadline. A wait therefore fires at its deadline and not at the end of a
	 * fixed interval, and an overdue deadline fires at once — which is what makes
	 * a restart catch up instead of adding an interval to every wait it inherits.
	 *
	 * The interval stays as a ceiling, because it is what finds a wait that was
	 * suspended after this timer was armed.
	 *
	 * Never throws. `start` cannot await this, so a failed read has to leave the
	 * sweeper armed on its interval rather than not armed at all.
	 */
	private async arm(): Promise<void> {
		if (this.stopped) return;

		let delayMs = this.intervalMs;
		try {
			const next = await this.stepStore.nextWaitDeadline();
			if (next !== null) delayMs = Math.min(delayMs, next.getTime() - Date.now());
		} catch (error) {
			this.logger.error('engine: wait sweep failed to read the next deadline', { error });
		}

		// The read above may have outlived a `stop`.
		if (this.stopped) return;

		this.timer = setTimeout(
			() => {
				this.sweeping = this.sweep().finally(() => {
					this.sweeping = undefined;
					this.rearm();
				});
			},
			Math.max(delayMs, 0),
		);
		// Unref'd: a pending sweep must not hold the process open.
		this.timer.unref();
	}

	/**
	 * One pass. Never throws: a failed sweep must not stop the next one.
	 *
	 * The sweep resumes a step first, then announces it. The reverse order
	 * announces a step that is still `waiting`. The claim then refuses that step,
	 * and the resume is lost for good.
	 *
	 * TODO(CAT-2938): a crash between the two leaves the row `queued` with
	 * nothing to dispatch it. A planned step that was never announced leaves the
	 * same state, and the same re-announcement recovers both.
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
