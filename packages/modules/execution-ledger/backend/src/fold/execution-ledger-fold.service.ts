import { Logger } from '@n8n/backend-common';
import { EventService, type EventMap } from '@n8n/backend-services';
import {
	type AfterFoldCommit,
	type ExecutionLedgerFoldStep,
	type ExecutionLedgerRow,
	type OperationContext,
	DbLock,
	DbLockService,
	DbLockUnavailableError,
	FoldStepRegistry,
	FoldTransactionLostError,
	withSavepoint,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';

import { FoldStepFailedError } from './fold-step-failed.error';
import { ExecutionLedgerParkedRepository } from '../database/repositories/execution-ledger-parked.repository';
import { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';
import type { ExecutionLedgerMetricsEventMap } from '../execution-ledger-metrics.events';

export const FOLD_BATCH_SIZE = 5000;

/** Pause between full batches, while a backlog remains. */
const BATCH_DELAY_MS = 250;

/** Consecutive lock skips after which the fold warns that something else holds the lock. */
const SKIP_WARN_THRESHOLD = 5;

/** Runs of a step on one batch before the fold parks the batch for it. The retry absorbs a deadlock. */
export const FOLD_STEP_ATTEMPTS = 2;

type FoldedBatch = {
	readable: number;
	unreadable: number;
	afterCommit: AfterFoldCommit[];
	parked: FoldStepFailedError[];
};

type StepResult = { ok: true; work?: AfterFoldCommit } | { ok: false; error: unknown };

/**
 * Moves claimed ledger rows into the tables of every registered fold step, in one transaction
 * with a savepoint for each step. A step that fails twice gets the batch parked, and the
 * fold commits the other steps.
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
	 * @throws FoldTransactionLostError, or an error of the claim or the park, after the batch rolled back
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
		const claimed = folded.readable + folded.unreadable;
		this.emitMetric('execution-ledger-fold-succeeded', { rows: claimed });
		this.reportParkedRows(folded);

		for (const work of folded.afterCommit) {
			try {
				await work();
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}

		return claimed;
	}

	private async foldClaimedBatch(
		steps: readonly ExecutionLedgerFoldStep[],
		ctx: OperationContext,
	): Promise<FoldedBatch> {
		const { rows, unreadable } = await this.repository.claimBatch(FOLD_BATCH_SIZE, ctx);
		const folded: FoldedBatch = {
			readable: rows.length,
			unreadable: unreadable.length,
			afterCommit: [],
			parked: [],
		};

		if (unreadable.length > 0) await this.parkedRepository.parkUnreadable(unreadable, ctx);
		if (rows.length === 0) return folded;

		for (const step of steps) {
			const result = await this.foldStepWithRetry(step, rows, ctx);
			if (result.ok) {
				if (result.work) folded.afterCommit.push(result.work);
				continue;
			}
			await this.parkedRepository.park(step.name, rows, getErrorMessage(result.error), ctx);
			folded.parked.push(new FoldStepFailedError(step.name, rows[0].id, result.error));
		}
		return folded;
	}

	private async foldStepWithRetry(
		step: ExecutionLedgerFoldStep,
		rows: readonly ExecutionLedgerRow[],
		ctx: OperationContext,
	): Promise<StepResult> {
		let lastError: unknown;
		for (let attempt = 1; attempt <= FOLD_STEP_ATTEMPTS; attempt++) {
			try {
				const work = await withSavepoint(
					ctx,
					step.name,
					async (stepCtx) => await step.fold(rows, stepCtx),
				);
				return { ok: true, work };
			} catch (error) {
				if (error instanceof FoldTransactionLostError) throw error;
				this.emitMetric('execution-ledger-fold-step-failed', { step: step.name });
				lastError = error;
				if (attempt < FOLD_STEP_ATTEMPTS) {
					this.logger.warn('Execution ledger fold step failed, the fold runs it again', {
						step: step.name,
						error: getErrorMessage(error),
					});
				}
			}
		}
		return { ok: false, error: lastError };
	}

	/** Runs after the commit, so it never reports rows that a rollback put back. */
	private reportParkedRows({ readable, unreadable, parked }: FoldedBatch) {
		if (unreadable > 0) {
			this.logger.error('Execution ledger fold parked rows that it could not read', {
				rows: unreadable,
			});
		}
		for (const failure of parked) {
			const { step, firstLedgerId, stepErrorMessage } = failure;
			this.logger.error('Execution ledger fold parked a batch for a failing step', {
				step,
				firstLedgerId,
				error: stepErrorMessage,
				rows: readable,
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

/** Whether the pause and a batch as long as the last one both end before the deadline. */
function hasTimeForNextBatch(lastBatchStartedAt: number, deadline: number): boolean {
	const now = Date.now();
	return now + (now - lastBatchStartedAt) + BATCH_DELAY_MS < deadline;
}
