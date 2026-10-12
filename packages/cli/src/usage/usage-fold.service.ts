import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	DbLock,
	DbLockService,
	UsageRepository,
	WorkflowStatisticsRepository,
	type FirstOccurrenceRow,
	type UsageEvent,
	type UsageFact,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { periodIncrementsOf, statisticsIncrementsOf } from './usage-aggregation';

/** SQLite has one writer, so its batches are smaller to keep the write lock short. */
const BATCH_SIZE = { postgresdb: 5000, sqlite: 1000 } as const;

/** Pause between full batches, i.e. while backlog remains. */
const BATCH_DELAY_MS = 250;

type BatchResult = { taken: number; firstOccurrences: FirstOccurrenceRow[] };

/**
 * Moves queued usage facts into the ledger, the per-period totals and `workflow_statistics`,
 * in one transaction per batch, on Postgres and SQLite alike.
 */
@Service()
export class UsageFoldService {
	private readonly batchSize: number;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly dbLockService: DbLockService,
		private readonly usageRepository: UsageRepository,
		private readonly statisticsRepository: WorkflowStatisticsRepository,
		private readonly statisticsService: WorkflowStatisticsService,
		globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('usage');
		this.batchSize = BATCH_SIZE[globalConfig.database.type];
	}

	/** Fold batches until one comes back partial, the signal aborts, or the budget runs out. */
	async fold(signal: AbortSignal, runBudgetMs = Number.POSITIVE_INFINITY): Promise<void> {
		const deadline = Date.now() + runBudgetMs;
		let batchStartedAt = Date.now();
		while (
			!signal.aborted &&
			(await this.foldBatch()) >= this.batchSize &&
			hasTimeForNextBatch(batchStartedAt, deadline)
		) {
			await this.waitBetweenBatches(signal);
			batchStartedAt = Date.now();
		}
	}

	/** Fold everything queued now, without pauses. */
	async foldAll(): Promise<void> {
		while ((await this.foldBatch()) >= this.batchSize) {
			// keep folding while batches come back full
		}
	}

	/** Returns how many queued facts the batch took. */
	private async foldBatch(): Promise<number> {
		let result: BatchResult;
		try {
			result = await this.dbLockService.tryWithLock(
				DbLock.WORKFLOW_STATISTICS_ROLLUP,
				async (tx) => {
					const batch = await this.usageRepository.takeBatch(tx, this.batchSize);
					if (batch.length === 0) return { taken: 0, firstOccurrences: [] };

					const fresh = await this.usageRepository.recordInLedger(tx, batch.map(toFact));
					await this.usageRepository.addToPeriods(tx, periodIncrementsOf(fresh));
					const firstOccurrences = await this.statisticsRepository.addFoldedCounts(
						tx,
						statisticsIncrementsOf(fresh),
					);
					return { taken: batch.length, firstOccurrences };
				},
			);
		} catch (error) {
			// Another run or process holds the lock; the next run picks the backlog up.
			if (error instanceof OperationalError) return 0;
			throw error;
		}

		await this.emitMilestones(result.firstOccurrences);
		return result.taken;
	}

	private async waitBetweenBatches(signal: AbortSignal): Promise<void> {
		try {
			await sleep(BATCH_DELAY_MS, signal);
		} catch {
			// `sleep` rejects only on abort, which the loop checks for on its own.
		}
	}

	private async emitMilestones(firstOccurrences: FirstOccurrenceRow[]): Promise<void> {
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

function toFact({ id: _, ...fact }: UsageEvent): UsageFact {
	return fact;
}

function hasTimeForNextBatch(lastBatchStartedAt: number, deadline: number): boolean {
	const now = Date.now();
	return now + (now - lastBatchStartedAt) + BATCH_DELAY_MS < deadline;
}
