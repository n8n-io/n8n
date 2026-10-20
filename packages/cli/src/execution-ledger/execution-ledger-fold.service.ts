import { TypedEmitter } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	ExecutionLedgerRepository,
	getLedgerParticipantClasses,
	type AfterFoldCommit,
	type ExecutionLedgerRow,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { ErrorReporter } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

const BATCH_SIZE = 5000;

/** Pause between full batches, i.e. while backlog remains. */
const BATCH_DELAY_MS = 250;

/** Net executions of one workflow in a folded batch. */
export type FoldedWorkflowAggregate = {
	workflowId: string;
	started: number;
	succeeded: number;
	failed: number;
};

type ExecutionLedgerEvents = {
	/** Fires after commit, on the instance that ran the fold. Not replayed if the process dies. */
	folded: { claimed: number; workflows: FoldedWorkflowAggregate[] };
};

/**
 * Folds `execution_ledger` rows into every registered participant in one transaction,
 * then fires each participant's after-commit work and the `folded` event.
 */
@Service()
export class ExecutionLedgerFoldService extends TypedEmitter<ExecutionLedgerEvents> {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly dbLockService: DbLockService,
		private readonly ledgerRepository: ExecutionLedgerRepository,
	) {
		super({ captureRejections: true });
	}

	/** Fold batches until one comes back partial, the signal aborts, or the budget runs out. */
	async fold(signal: AbortSignal, runBudgetMs = Number.POSITIVE_INFINITY): Promise<void> {
		const deadline = Date.now() + runBudgetMs;
		while (!signal.aborted && (await this.foldBatch()) >= BATCH_SIZE && Date.now() < deadline) {
			try {
				await sleep(BATCH_DELAY_MS, signal);
			} catch {
				// `sleep` rejects only on abort, which the loop checks for on its own.
			}
		}
	}

	/** Fold one batch. Returns how many rows it claimed, or 0 if another process holds the lock. */
	async foldBatch(): Promise<number> {
		const participants = getLedgerParticipantClasses().map((cls) => Container.get(cls));

		let claimed: ExecutionLedgerRow[];
		let afterCommit: AfterFoldCommit[];
		try {
			({ claimed, afterCommit } = await this.dbLockService.tryWithLockContext(
				DbLock.EXECUTION_LEDGER_FOLD,
				async (ctx) => {
					const rows = await this.ledgerRepository.claimBatch(ctx, BATCH_SIZE);
					const afterCommitWork: AfterFoldCommit[] = [];
					if (rows.length === 0) return { claimed: rows, afterCommit: afterCommitWork };

					for (const participant of participants) {
						const work = await participant.fold(rows, ctx);
						if (work) afterCommitWork.push(work);
					}
					return { claimed: rows, afterCommit: afterCommitWork };
				},
			));
		} catch (error) {
			if (error instanceof OperationalError) return 0; // another run or process holds the lock
			throw error;
		}

		if (claimed.length === 0) return 0;

		for (const work of afterCommit) {
			try {
				await work();
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}

		this.emit('folded', { claimed: claimed.length, workflows: aggregateByWorkflow(claimed) });

		return claimed.length;
	}
}

function aggregateByWorkflow(rows: ExecutionLedgerRow[]): FoldedWorkflowAggregate[] {
	const byWorkflow = new Map<string, FoldedWorkflowAggregate>();
	for (const row of rows) {
		let aggregate = byWorkflow.get(row.workflowId);
		if (!aggregate) {
			aggregate = { workflowId: row.workflowId, started: 0, succeeded: 0, failed: 0 };
			byWorkflow.set(row.workflowId, aggregate);
		}
		if (row.event === 'started') aggregate.started += row.delta;
		else if (row.status === 'success') aggregate.succeeded += row.delta;
		else aggregate.failed += row.delta;
	}
	return [...byWorkflow.values()];
}
