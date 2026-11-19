import { Logger } from '@n8n/backend-common';
import { EventService, type EventMap } from '@n8n/backend-services';
import {
	type AfterFoldCommit,
	type ExecutionLedgerFoldStep,
	type OperationContext,
	DbLock,
	DbLockService,
	DbLockUnavailableError,
	FoldStepRegistry,
	FoldTransactionLostError,
	withSavepoint,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';

import { FoldFailureStreaks } from './fold-failure-streaks';
import { FoldStepFailedError } from './fold-step-failed.error';
import {
	ExecutionLedgerParkedRepository,
	UNREADABLE_ROWS_STEP,
} from '../database/repositories/execution-ledger-parked.repository';
import { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';
import type { ExecutionLedgerMetricsEventMap } from '../execution-ledger-metrics.events';

export const FOLD_BATCH_SIZE = 5000;

/** Pause between full batches, while a backlog remains. */
const BATCH_DELAY_MS = 250;

/** Consecutive lock skips after which the fold warns that something else holds the lock. */
const SKIP_WARN_THRESHOLD = 5;

/** Failures in a row on the same batch after which the fold parks the batch for the step. */
export const FOLD_FAILURE_ALERT_THRESHOLD = 3;

type FoldedBatch = {
	claimed: number;
	unreadable: number;
	afterCommit: AfterFoldCommit[];
	parked: FoldStepFailedError[];
};

/**
 * Moves claimed ledger rows into the tables of every registered fold step, in one transaction
 * with a savepoint for each step. A failing step rolls the whole batch back into the ledger,
 * until its third failure in a row: then the fold parks the batch for that step and goes on.
 */
@Service()
export class ExecutionLedgerFoldService {
	private consecutiveLockSkips = 0;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly dbLockService: DbLockService,
		private readonly repository: ExecutionLedgerRepository,
		private readonly stepRegistry: FoldStepRegistry,
		private readonly eventService: EventService,
		private readonly parkedRepository: ExecutionLedgerParkedRepository,
		private readonly failureStreaks: FoldFailureStreaks,
	) {
		this.logger = this.logger.scoped('execution-ledger');
	}

	/**
	 * Folds batches until one comes back partial, the signal aborts, or the budget has no room
	 * for another batch. The budget does not interrupt a batch.
	 */
	async fold(signal: AbortSignal, runBudgetMs = Number.POSITIVE_INFINITY): Promise<void> {
		const deadline = Date.now() + runBudgetMs;
		let batchStartedAt = Date.now();
		while (
			!signal.aborted &&
			(await this.foldBatch()) >= FOLD_BATCH_SIZE &&
			hasTimeForNextBatch(batchStartedAt, deadline)
		) {
			try {
				await sleep(BATCH_DELAY_MS, signal);
			} catch {
				// `sleep` rejects only on abort, which the loop checks for on its own.
			}
			batchStartedAt = Date.now();
		}
	}

	/**
	 * Folds one batch and runs the after-commit work of its steps.
	 * Returns the number of rows claimed, or 0 when another fold holds the lock.
	 * @throws FoldStepFailedError or FoldTransactionLostError, after the batch rolled back
	 */
	async foldBatch(): Promise<number> {
		const steps = this.stepRegistry.getAll();
		// With no step, the claim would delete rows that no feature ever counted.
		if (steps.length === 0) return 0;

		let folded: FoldedBatch;
		try {
			folded = await this.dbLockService.tryWithLockContext(
				DbLock.EXECUTION_LEDGER_FOLD,
				async (ctx) => await this.foldClaimedBatch(steps, ctx),
			);
		} catch (error) {
			if (error instanceof DbLockUnavailableError) {
				this.registerLockSkip();
				return 0;
			}
			throw error;
		}

		this.consecutiveLockSkips = 0;
		this.emitMetric('execution-ledger-fold-succeeded', { rows: folded.claimed });
		this.reportParkedRows(folded);

		for (const work of folded.afterCommit) {
			try {
				await work();
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}

		return folded.claimed;
	}

	private async foldClaimedBatch(
		steps: readonly ExecutionLedgerFoldStep[],
		ctx: OperationContext,
	): Promise<FoldedBatch> {
		const { rows, unreadable } = await this.repository.claimBatch(FOLD_BATCH_SIZE, ctx);
		const folded: FoldedBatch = {
			claimed: rows.length + unreadable.length,
			unreadable: unreadable.length,
			afterCommit: [],
			parked: [],
		};

		if (unreadable.length > 0) {
			await this.parkedRepository.park(
				UNREADABLE_ROWS_STEP,
				unreadable,
				'Ledger row has an unexpected value',
				ctx,
			);
		}
		if (rows.length === 0) return folded;

		const firstLedgerId = rows[0].id;
		for (const step of steps) {
			try {
				const stepWork = await withSavepoint(
					ctx,
					step.name,
					async (stepCtx) => await step.fold(rows, stepCtx),
				);
				if (stepWork) folded.afterCommit.push(stepWork);
			} catch (error) {
				if (error instanceof FoldTransactionLostError) throw error;
				this.emitMetric('execution-ledger-fold-step-failed', { step: step.name });

				const attempt = (await this.failureStreaks.get(step.name, firstLedgerId)) + 1;
				const failure = new FoldStepFailedError(step.name, attempt, firstLedgerId, error);
				if (attempt < FOLD_FAILURE_ALERT_THRESHOLD) {
					await this.failureStreaks.set(step.name, firstLedgerId, attempt);
					throw failure;
				}

				// The count is not saved here: if a later step rolls the batch back, this step parks again.
				await this.parkedRepository.park(step.name, rows, messageOf(error), ctx);
				folded.parked.push(failure);
			}
		}
		return folded;
	}

	/** Runs after the commit, so it never reports rows that a rollback put back. */
	private reportParkedRows({ claimed, unreadable, parked }: FoldedBatch) {
		if (unreadable > 0) {
			this.logger.error('Execution ledger fold parked rows that it could not read', {
				rows: unreadable,
			});
		}
		for (const failure of parked) {
			const { step, attempt, firstLedgerId } = failure;
			this.logger.error('Execution ledger fold parked a batch for a failing step', {
				step,
				attempt,
				firstLedgerId,
				rows: claimed - unreadable,
			});
			this.errorReporter.error(failure, { shouldBeLogged: false });
		}
	}

	/** A throwing listener must not fail a fold that already committed. */
	private emitMetric<E extends keyof ExecutionLedgerMetricsEventMap>(
		event: E,
		payload: EventMap[E],
	) {
		try {
			this.eventService.emit(event, payload);
		} catch {
			// Deliberately swallowed, see above.
		}
	}

	/** Persistent skips suggest another deployment on the same database holds the lock. */
	private registerLockSkip() {
		this.consecutiveLockSkips++;
		if (this.consecutiveLockSkips % SKIP_WARN_THRESHOLD !== 0) return;

		this.logger.warn('Execution ledger fold repeatedly skipped: lock held by another process', {
			consecutiveLockSkips: this.consecutiveLockSkips,
		});
	}
}

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Whether the pause and a batch as long as the last one both end before the deadline. */
function hasTimeForNextBatch(lastBatchStartedAt: number, deadline: number): boolean {
	const now = Date.now();
	return now + (now - lastBatchStartedAt) + BATCH_DELAY_MS < deadline;
}
