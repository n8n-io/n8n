import { Logger } from '@n8n/backend-common';
import {
	type AfterFoldCommit,
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

import { FoldStepFailedError } from './fold-step-failed.error';
import { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';

export const FOLD_BATCH_SIZE = 5000;

/** Pause between full batches, while a backlog remains. */
const BATCH_DELAY_MS = 250;

/** Consecutive lock skips after which the fold warns that something else holds the lock. */
const SKIP_WARN_THRESHOLD = 5;

/**
 * Moves claimed ledger rows into the tables of every registered fold step, in one transaction
 * with a savepoint for each step. A failing step rolls the whole batch back into the ledger.
 */
@Service()
export class ExecutionLedgerFoldService {
	/** The batch that failed last, keyed by its first ledger id. A handover resets it. */
	private failedBatch: { key: string; failures: number } | undefined;

	private consecutiveLockSkips = 0;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly dbLockService: DbLockService,
		private readonly repository: ExecutionLedgerRepository,
		private readonly stepRegistry: FoldStepRegistry,
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
	 * Returns the number of rows folded, or 0 when another fold holds the lock.
	 * @throws FoldStepFailedError or FoldTransactionLostError, after the batch rolled back
	 */
	async foldBatch(): Promise<number> {
		const steps = this.stepRegistry.getAll();
		// With no step, the claim would delete rows that no feature ever counted.
		if (steps.length === 0) return 0;

		let folded: { claimed: number; afterCommit: AfterFoldCommit[] };
		try {
			folded = await this.dbLockService.tryWithLockContext(
				DbLock.EXECUTION_LEDGER_FOLD,
				async (ctx) => {
					const afterCommit: AfterFoldCommit[] = [];
					const rows = await this.repository.claimBatch(FOLD_BATCH_SIZE, ctx);
					if (rows.length === 0) return { claimed: 0, afterCommit };

					for (const step of steps) {
						try {
							const stepWork = await withSavepoint(
								ctx,
								step.name,
								async (stepCtx) => await step.fold(rows, stepCtx),
							);
							if (stepWork) afterCommit.push(stepWork);
						} catch (error) {
							if (error instanceof FoldTransactionLostError) throw error;
							throw new FoldStepFailedError(step.name, this.recordFailure(rows[0].id), error);
						}
					}
					return { claimed: rows.length, afterCommit };
				},
			);
		} catch (error) {
			if (error instanceof DbLockUnavailableError) {
				this.registerLockSkip();
				return 0;
			}
			throw error;
		}

		this.consecutiveLockSkips = 0;
		if (folded.claimed > 0) this.failedBatch = undefined;

		for (const work of folded.afterCommit) {
			try {
				await work();
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}

		return folded.claimed;
	}

	/** Returns how many times in a row this batch has failed, this one included. */
	private recordFailure(batchKey: string): number {
		const failures = this.failedBatch?.key === batchKey ? this.failedBatch.failures + 1 : 1;
		this.failedBatch = { key: batchKey, failures };
		return failures;
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
