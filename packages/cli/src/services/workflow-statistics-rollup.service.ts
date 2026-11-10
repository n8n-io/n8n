import { Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	LicenseMetricsRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';
import { OperationalError } from '@n8n/errors';

import { WorkflowStatisticsService } from './workflow-statistics.service';

type RollupResult = Awaited<ReturnType<WorkflowStatisticsRepository['rollupIncrements']>>;

const BATCH_SIZE = 5000;

/** Pause between full batches, i.e. while backlog remains. */
const BATCH_DELAY_MS = 250;

/** Consecutive lock skips after which to warn that the lock is persistently held elsewhere. */
const SKIP_WARN_THRESHOLD = 5;

/**
 * Folds workflow and agent statistics increments into their counters.
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
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
	) {
		this.logger = this.logger.scoped('workflow-statistics');
	}

	/**
	 * Fold batches until one comes back partial, the signal aborts, or the run
	 * budget has no room left for another batch. The optional budget is in
	 * milliseconds. It limits additional batches, but does not interrupt a batch.
	 */
	async rollup(signal: AbortSignal, runBudgetMs = Number.POSITIVE_INFINITY): Promise<void> {
		const deadline = Date.now() + runBudgetMs;
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

	/** Fold each buffer and fire workflow milestones. Return the largest batch size. */
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

	/** Fold a batch under an advisory lock. Returns null if another run or process holds the lock. */
	private async foldBatch(): Promise<RollupResult | null> {
		try {
			const result = await this.dbLockService.tryWithLockContext(
				DbLock.WORKFLOW_STATISTICS_ROLLUP,
				async (ctx) => {
					const workflows = await this.repository.rollupIncrementsInContext(ctx, BATCH_SIZE);
					const agentIncrements = await this.licenseMetricsRepository.rollupAgentIncrements(
						ctx,
						BATCH_SIZE,
					);
					return { ...workflows, increments: Math.max(workflows.increments, agentIncrements) };
				},
			);
			this.consecutiveLockSkips = 0;
			return result;
		} catch (error) {
			if (error instanceof OperationalError) {
				this.registerLockSkip(); // another run or process holds the lock
				return null;
			}
			throw error;
		}
	}

	/**
	 * Occasional skips are expected around leader transitions and when a slow run overlaps the next
	 * one; persistent skips suggest a process outside this deployment holds the lock, e.g. a second
	 * n8n instance sharing this database (advisory locks are not schema- or table-prefix-scoped).
	 */
	private registerLockSkip() {
		this.consecutiveLockSkips++;
		this.totalLockSkips++;

		if (this.consecutiveLockSkips % SKIP_WARN_THRESHOLD !== 0) return;

		this.logger.warn(
			'Workflow statistics rollup repeatedly skipped: lock held by another run or process',
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
