import type { EngineLogger } from '../logging';
import { createConsoleLogger } from '../logging';
import type { CancelExecutionService } from './cancel-execution.service';
import type { ExecutionStore } from './execution-store';

/** The longest the sweeper sleeps, so it finds a deadline that no nudge told it about. */
export const DEFAULT_TIMEOUT_SWEEP_INTERVAL_MS = 60_000;

/** Enough that a backlog drains in a few sweeps, few enough to bound one pass. */
export const DEFAULT_TIMEOUT_SWEEP_BATCH_SIZE = 500;

/**
 * Cancels the executions whose deadline has passed.
 *
 * A timeout is a cancel: the sweeper calls the same cancel as a request, so
 * the steps, the waits and the sub-executions end the same way. Nothing records
 * why the execution ended. The read compares the finish time with the deadline.
 *
 * Several processes can sweep at once. The cancel is a compare-and-set, so an
 * execution that another process cancelled first is left as it is.
 *
 * Sweeps do not overlap: the next is scheduled once the current one settles,
 * so a slow database stretches the interval rather than stacking sweeps.
 */
export class TimeoutSweeper {
	private timer: NodeJS.Timeout | undefined;
	/** When the armed timer fires, so a nudge re-arms only for an earlier deadline. */
	private armedFor: number | undefined;
	private stopped = false;
	/** The sweep in flight, so `stop` can wait for it to settle. */
	private sweeping: Promise<void> | undefined;
	/** The arm in flight, so `stop` can wait before it sets another timer. */
	private arming: Promise<void> | undefined;
	/**
	 * Set when a cancel failed. The failed row is still past its deadline, so the
	 * next arm waits the whole interval instead of retrying at once.
	 */
	private backOff = false;

	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly cancelExecution: Pick<CancelExecutionService, 'cancel'>,
		private readonly logger: EngineLogger = createConsoleLogger(),
		private readonly intervalMs: number = DEFAULT_TIMEOUT_SWEEP_INTERVAL_MS,
		private readonly batchSize: number = DEFAULT_TIMEOUT_SWEEP_BATCH_SIZE,
	) {}

	start(): void {
		this.stopped = false;
		this.rearm();
	}

	async stop(): Promise<void> {
		this.stopped = true;
		clearTimeout(this.timer);
		this.timer = undefined;
		this.armedFor = undefined;
		await this.arming;
		await this.sweeping;
	}

	/**
	 * An execution with this deadline started after the sweeper armed. Re-arm
	 * when the deadline comes before the armed timer, so the timeout fires on
	 * time instead of at the end of the interval.
	 */
	noteDeadline(deadline: Date): void {
		if (this.stopped) return;
		if (this.armedFor !== undefined && deadline.getTime() >= this.armedFor) return;
		this.rearm();
	}

	/** Arms run one after the other, so two nudges cannot leave two timers. */
	private rearm(): void {
		this.arming = (this.arming ?? Promise.resolve()).then(async () => await this.arm());
	}

	/**
	 * Schedules the next sweep at the earlier of the interval and the next
	 * deadline. An overdue deadline fires at once, so a restart catches up.
	 *
	 * Never throws. `start` cannot await this, so a failed read has to leave the
	 * sweeper armed on its interval rather than not armed at all.
	 */
	private async arm(): Promise<void> {
		if (this.stopped) return;

		let delayMs = this.intervalMs;
		if (this.backOff) {
			this.backOff = false;
		} else {
			try {
				const next = await this.executionStore.nextDeadline();
				if (next !== null) delayMs = Math.min(delayMs, next.getTime() - Date.now());
			} catch (error) {
				this.logger.error('engine: timeout sweep failed to read the next deadline', { error });
			}
		}

		// The read above may have outlived a `stop`.
		if (this.stopped) return;

		// A nudge may have armed a timer while this read was in flight.
		clearTimeout(this.timer);
		delayMs = Math.max(delayMs, 0);
		this.armedFor = Date.now() + delayMs;
		this.timer = setTimeout(() => {
			this.timer = undefined;
			this.armedFor = undefined;
			this.sweeping = this.sweep().finally(() => {
				this.sweeping = undefined;
				this.rearm();
			});
		}, delayMs);
		// Unref'd: a pending sweep must not hold the process open.
		this.timer.unref();
	}

	/** One pass. Never throws: a failed sweep must not stop the next one. */
	private async sweep(): Promise<void> {
		let due: string[];
		try {
			due = await this.executionStore.findExecutionsPastDeadline(new Date(), this.batchSize);
		} catch (error) {
			this.logger.error('engine: timeout sweep failed to find executions past their deadline', {
				error,
			});
			return;
		}

		for (const executionId of due) {
			// The runtime stops the sweepers before the queues that a cancel publishes to.
			if (this.stopped) return;
			try {
				await this.cancelExecution.cancel(executionId);
			} catch (error) {
				// The row is still past its deadline, so a later sweep tries again.
				this.backOff = true;
				this.logger.error('engine: timeout sweep failed to cancel an execution', {
					error,
					executionId,
				});
			}
		}
	}
}
