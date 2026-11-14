import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { ErrorReporter } from 'n8n-core';
import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import { toLedgerOutcome } from './counting-rules';
import type {
	ExecutionLedgerEndedFacts,
	ExecutionLedgerStartedFacts,
	ExecutionLedgerWriter,
} from './execution-ledger-writer';

/** An execution row as `create` inserted it, plus the tombstone it replaced, if any. */
export type CreatedExecution = {
	started: ExecutionLedgerStartedFacts;
	status: ExecutionStatus;
	startedAt?: Date;
	stoppedAt?: Date;
	/** The row copies a run from elsewhere, so it is not a run of this instance. */
	isCopy?: boolean;
	reclaimedTombstone?: {
		executionId: string;
		workflowId: string;
		mode: WorkflowExecuteMode;
	} | null;
};

/**
 * Records run events in the execution ledger. Does nothing until the `execution-ledger` module
 * binds a writer, so core code can call it without importing the module.
 */
@Service()
export class ExecutionLedger {
	private writer?: ExecutionLedgerWriter;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {}

	/** Single-shot: a second writer would be silently ignored. */
	setImplementation(writer: ExecutionLedgerWriter) {
		if (this.writer) {
			throw new UnexpectedError('An execution ledger writer is already registered');
		}

		this.writer = writer;
	}

	/** Lets callers skip building facts when the module is off. */
	get isEnabled() {
		return this.writer !== undefined;
	}

	/**
	 * Writes the rows for a new execution row, in its transaction. A reclaimed tombstone
	 * never ran, so it ends blocked. A row created finished also gets its `ended` row here.
	 */
	async recordCreated(created: CreatedExecution, ctx: OperationContext): Promise<void> {
		assertTransaction(ctx);
		if (!this.writer) return;

		const { started, reclaimedTombstone } = created;
		const blocked = { outcome: 'blocked', blockedBy: 'startFailed' } as const;

		if (reclaimedTombstone) {
			// Same dedup key, so the same workflow: the name and the time come from the new run.
			const { executionId, workflowId, mode } = reclaimedTombstone;
			await this.recordEndedInTransaction(
				{ ...started, ...blocked, executionId, workflowId, mode, source: undefined },
				ctx,
			);
		}

		if (created.isCopy) return;

		const recorded = await this.recordStarted(started, ctx);
		const { mode } = started;
		const outcome = toLedgerOutcome({
			mode,
			status: created.status,
			startedAt: created.startedAt ?? null,
		});
		if (!recorded || outcome === 'none') return;

		if (outcome !== 'blocked') {
			// No caller creates a row that finished with work done, so its runtime is unknown.
			this.errorReporter.error(
				new UnexpectedError('An execution row was created finished with work done', {
					extra: { executionId: started.executionId, status: created.status },
				}),
			);
			return;
		}

		await this.recordEndedInTransaction(
			{ ...started, ...blocked, occurredAt: created.stoppedAt ?? started.occurredAt },
			ctx,
		);
	}

	/**
	 * Inserts in the transaction of the execution row, so a failed insert rolls the run back.
	 * Returns whether the row was written, so callers write no `ended` row for an unrecorded run.
	 */
	async recordStarted(facts: ExecutionLedgerStartedFacts, ctx: OperationContext): Promise<boolean> {
		assertTransaction(ctx);
		if (!this.writer) return false;

		const recorded = await this.writer.writeStarted(facts, ctx);
		if (!recorded) this.reportNoOwnerProject(facts);
		return recorded;
	}

	async recordEndedInTransaction(
		facts: ExecutionLedgerEndedFacts,
		ctx: OperationContext,
	): Promise<void> {
		assertTransaction(ctx);
		if (!this.writer) return;

		if (!(await this.writer.writeEnded(facts, ctx))) this.reportNoOwnerProject(facts);
	}

	/**
	 * Never rejects, so callers can drop the promise. Like workflow statistics, an insert that
	 * is still running when the process exits is lost.
	 */
	async recordEnded(facts: ExecutionLedgerEndedFacts): Promise<void> {
		if (!this.writer) return;

		try {
			if (!(await this.writer.writeEnded(facts, {}))) this.reportNoOwnerProject(facts);
		} catch (e) {
			const error = ensureError(e);
			const { executionId, workflowId } = facts;
			// The text log format drops metadata, so the message carries the IDs and the cause.
			this.logger.error(
				`Failed to record the end of execution ${executionId} in the execution ledger: ${error.message}`,
				{ executionId, workflowId, error },
			);
			this.errorReporter.error(error, {
				extra: { executionId, workflowId },
				shouldBeLogged: false,
			});
		}
	}

	private reportNoOwnerProject({ executionId, workflowId }: ExecutionLedgerStartedFacts) {
		this.logger.error(
			`Execution ${executionId} of workflow ${workflowId} is not in the execution ledger: the workflow has no owner project`,
			{ executionId, workflowId },
		);
		// No IDs in the reported message, so Sentry groups every case in one issue.
		const error = new UnexpectedError(
			'The run is not in the execution ledger: the workflow has no owner project',
			{ extra: { executionId, workflowId } },
		);
		this.errorReporter.error(error, { shouldBeLogged: false });
	}
}

/** Not gated on the writer: a caller without a transaction must also fail when the module is off. */
function assertTransaction(ctx: OperationContext) {
	if (!ctx.trx) throw new UnexpectedError('A ledger insert needs an active transaction');
}
