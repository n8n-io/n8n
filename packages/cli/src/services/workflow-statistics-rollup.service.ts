import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { DbLock, DbLockService, WorkflowStatisticsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { WorkflowStatisticsService } from './workflow-statistics.service';

type RollupResult = Awaited<ReturnType<WorkflowStatisticsRepository['rollupIncrements']>>;

const BATCH_SIZE = 5000;

/** Pause between full batches, i.e. while backlog remains. */
const BATCH_DELAY_MS = 250;

export const ROLLUP_INTERVAL_SECONDS = 5;

/** Leaves a margin below the task interval for a batch slower than the one before. */
const RUN_BUDGET_MS = (ROLLUP_INTERVAL_SECONDS - 1) * Time.seconds.toMilliseconds;

/** Consecutive lock skips after which to warn that the lock is persistently held elsewhere. */
const SKIP_WARN_THRESHOLD = 5;

/**
 * Folds statistics increments in the `workflow_statistics_delta` table
 * into the `workflow_statistics` table.
 */
@Service()
export class WorkflowStatisticsRollupService {
	private consecutiveLockSkips = 0;

	private totalLockSkips = 0;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly dbLockService: DbLockService,
		private readonly repository: WorkflowStatisticsRepository,
		private readonly statisticsService: WorkflowStatisticsService,
	) {
		this.logger = this.logger.scoped('workflow-statistics');
	}

	/**
	 * Fold batches until one comes back partial, the signal aborts, or the run
	 * budget has no room left for another batch.
	 */
	async rollup(signal: AbortSignal): Promise<void> {
		const deadline = Date.now() + RUN_BUDGET_MS;
		let batchStartedAt = Date.now();
		while (
			!signal.aborted &&
			(await this.rollupBatch()) >= BATCH_SIZE &&
			hasTimeForNextBatch(batchStartedAt, deadline)
		) {
			await this.waitBetweenBatches(signal);
			batchStartedAt = Date.now();
		}
	}

	/** Fold one batch of increments and fire any resulting milestones. Returns increments folded. */
	private async rollupBatch(): Promise<number> {
		const result = await this.foldBatch();
		if (!result) return 0;

		await this.emitMilestones(result.firstOccurrences);

		return result.increments;
	}

	private async waitBetweenBatches(signal: AbortSignal): Promise<void> {
		try {
			await sleep(BATCH_DELAY_MS, signal);
		} catch {
			// `sleep` rejects only on abort, which the loop checks for on its own.
		}
	}

	/** Fold a batch under an advisory lock. Returns null if another instance holds the lock. */
	private async foldBatch(): Promise<RollupResult | null> {
		try {
			const result = await this.dbLockService.tryWithLock(
				DbLock.WORKFLOW_STATISTICS_ROLLUP,
				async (tx) => await this.repository.rollupIncrements(tx, BATCH_SIZE),
			);
			this.consecutiveLockSkips = 0;
			return result;
		} catch (error) {
			if (error instanceof OperationalError) {
				this.registerLockSkip(); // another instance holds the lock
				return null;
			}
			throw error;
		}
	}

	/**
	 * Occasional skips are expected around leader transitions; persistent skips suggest a process
	 * outside this deployment holds the lock, e.g. a second n8n instance sharing this database
	 * (advisory locks are not schema- or table-prefix-scoped).
	 */
	private registerLockSkip() {
		this.consecutiveLockSkips++;
		this.totalLockSkips++;

		if (this.consecutiveLockSkips % SKIP_WARN_THRESHOLD !== 0) return;

		this.logger.warn(
			'Workflow statistics rollup repeatedly skipped: lock held by another process',
			{
				consecutiveLockSkips: this.consecutiveLockSkips,
				totalLockSkips: this.totalLockSkips,
			},
		);
	}

	/** Fire the one-time milestone event for each workflow whose counter row was just created. */
	private async emitMilestones(firstOccurrences: RollupResult['firstOccurrences']): Promise<void> {
		for (const occurrence of firstOccurrences) {
			try {
				await this.statisticsService.emitFirstOccurrenceEvent(
					occurrence.name,
					occurrence.workflowId,
					occurrence.workflowName,
					occurrence.firstEventMs,
				);
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}
	}
}

/** Whether the pause and a batch as long as the last one both end before the deadline. */
function hasTimeForNextBatch(lastBatchStartedAt: number, deadline: number): boolean {
	const now = Date.now();
	return now + (now - lastBatchStartedAt) + BATCH_DELAY_MS < deadline;
}
