import { UnexpectedError } from '../common';
import type { ExecutionFileCleanup, ExecutionStore, PrunableExecution } from '../execution';
import type { EngineLogger } from '../logging';

const DEFAULT_RETENTION_SWEEP_INTERVAL_MS = 60 * 60_000;

const DEFAULT_RETENTION_BATCH_SIZE = 100;

/** Node replaces a delay above this with 1 ms. */
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

/** How long the engine keeps an ended execution, and how it sweeps the older ones. */
export interface ExecutionRetentionPolicy {
	/** Delete an execution that ended more than this long ago. */
	maxAgeMs: number;
	/** Delete an ended execution that is not among the newest this many. `0` or none: no limit. */
	maxCount?: number;
	/** The time from the end of one pass to the start of the next. Defaults to an hour. */
	intervalMs?: number;
	/** How many executions one batch selects. Defaults to 100. */
	batchSize?: number;
}

/**
 * Deletes the executions that ended before the retention period or that are
 * not among the newest `maxCount` ended executions, with their files.
 *
 * Each orchestrator process runs its own sweeper, without coordination. The first pass
 * starts after a random part of the interval, so processes that start together
 * spread their passes. The passes of one sweeper do not overlap: the sweeper
 * sets the next timer after the current pass ends.
 */
export class RetentionSweeper {
	private readonly maxAgeMs: number;
	private readonly maxCount: number;
	private readonly intervalMs: number;
	private readonly batchSize: number;
	private timer: NodeJS.Timeout | undefined;
	/** The pass in progress, so `stop` can wait for it. */
	private pass: Promise<void> | undefined;
	private stopped = true;

	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly fileCleanup: ExecutionFileCleanup,
		policy: ExecutionRetentionPolicy,
		private readonly logger: EngineLogger,
		private readonly random: () => number = Math.random,
	) {
		this.maxAgeMs = policy.maxAgeMs;
		this.maxCount = policy.maxCount ?? 0;
		this.intervalMs = policy.intervalMs ?? DEFAULT_RETENTION_SWEEP_INTERVAL_MS;
		this.batchSize = policy.batchSize ?? DEFAULT_RETENTION_BATCH_SIZE;
		if (!Number.isSafeInteger(this.maxAgeMs) || this.maxAgeMs < 0) {
			throw new UnexpectedError('The retention policy value "maxAgeMs" is not valid');
		}
		if (!Number.isSafeInteger(this.maxCount) || this.maxCount < 0) {
			throw new UnexpectedError('The retention policy value "maxCount" is not valid');
		}
		if (
			!Number.isSafeInteger(this.intervalMs) ||
			this.intervalMs <= 0 ||
			this.intervalMs > MAX_TIMER_DELAY_MS
		) {
			throw new UnexpectedError('The retention policy value "intervalMs" is not valid');
		}
		if (!Number.isSafeInteger(this.batchSize) || this.batchSize <= 0) {
			throw new UnexpectedError('The retention policy value "batchSize" is not valid');
		}
	}

	/** Does nothing when the sweeper is already started, so it has one timer. */
	start(): void {
		if (!this.stopped) return;
		this.stopped = false;
		this.schedule(this.random() * this.intervalMs);
	}

	/** Clears the timer and waits for the pass in progress. */
	async stop(): Promise<void> {
		this.stopped = true;
		clearTimeout(this.timer);
		this.timer = undefined;
		await this.pass;
	}

	private schedule(delayMs: number): void {
		if (this.stopped) return;
		this.timer = setTimeout(() => {
			this.pass = this.runPass().finally(() => {
				this.pass = undefined;
				this.schedule(this.intervalMs);
			});
		}, delayMs);
		this.timer.unref();
	}

	/**
	 * Deletes batch after batch until a batch is not full or the sweeper stops.
	 * Each batch starts after the last row of the batch before, so an execution
	 * that a batch keeps is tried again in the next pass, not in this one.
	 *
	 * Never rejects: nothing handles a rejected pass, and `stop` awaits it.
	 */
	private async runPass(): Promise<void> {
		let deleted = 0;
		try {
			// An execution that ends later only moves the cutoff forward, so one read per pass is safe.
			const countCutoff =
				this.maxCount > 0
					? await this.executionStore.findRetentionCountCutoff(this.maxCount)
					: undefined;
			let after: PrunableExecution | undefined;
			while (!this.stopped) {
				const batch = await this.executionStore.findPrunableExecutions({
					maxAgeMs: this.maxAgeMs,
					countCutoff,
					limit: this.batchSize,
					after,
				});
				deleted += await this.deleteBatch(batch);
				if (batch.length < this.batchSize) break;
				after = batch[batch.length - 1];
			}
		} catch (error) {
			this.logger.error('Execution retention pass failed', { error, deleted });
			return;
		}
		if (deleted > 0) this.logger.info('Execution retention pass finished', { deleted });
	}

	/** Deletes the files before the rows. An execution whose files fail to delete keeps its rows. */
	private async deleteBatch(batch: PrunableExecution[]): Promise<number> {
		const withoutFiles = await this.fileCleanup.deleteFilesOf(
			batch.map(({ id, workflowId }) => ({ executionId: id, workflowId })),
		);
		if (withoutFiles.length === 0) return 0;
		return await this.executionStore.deleteEndedExecutions(
			withoutFiles.map(({ executionId }) => executionId),
		);
	}
}
