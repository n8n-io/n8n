import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import type {
	ExecutionLedgerEndedFacts,
	ExecutionLedgerStartedFacts,
	ExecutionLedgerWriteResult,
	ExecutionLedgerWriter,
} from './execution-ledger-writer';

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
	 * Inserts in the transaction of the execution row, so a failed insert rolls the run back.
	 * Returns whether the row was written, so callers write no `ended` row for an unrecorded run.
	 */
	async recordStarted(facts: ExecutionLedgerStartedFacts, ctx: OperationContext): Promise<boolean> {
		if (!this.writer) return false;
		assertTransaction(ctx);

		const result = await this.writer.writeStarted(facts, ctx);
		this.reportUnrecorded(result, facts);
		return result.recorded;
	}

	async recordEndedInTransaction(
		facts: ExecutionLedgerEndedFacts,
		ctx: OperationContext,
	): Promise<void> {
		if (!this.writer) return;
		assertTransaction(ctx);

		this.reportUnrecorded(await this.writer.writeEnded(facts, ctx), facts);
	}

	/**
	 * Never rejects, so callers can drop the promise. Like workflow statistics, an insert that
	 * is still running when the process exits is lost.
	 */
	async recordEnded(facts: ExecutionLedgerEndedFacts): Promise<void> {
		if (!this.writer) return;

		try {
			this.reportUnrecorded(await this.writer.writeEnded(facts, {}), facts);
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

	private reportUnrecorded(
		result: ExecutionLedgerWriteResult,
		{ executionId, workflowId }: ExecutionLedgerStartedFacts,
	) {
		if (result.recorded) return;

		const cause = UNRECORDED_CAUSES[result.reason];
		this.logger.error(
			`Execution ${executionId} of workflow ${workflowId} is not in the execution ledger: ${cause}`,
			{ executionId, workflowId },
		);
		// No IDs in the reported message, so Sentry groups every case of a reason in one issue.
		const error = new UnexpectedError(`The run is not in the execution ledger: ${cause}`, {
			extra: { executionId, workflowId },
		});
		this.errorReporter.error(error, { shouldBeLogged: false });
	}
}

type UnrecordedReason = Extract<ExecutionLedgerWriteResult, { recorded: false }>['reason'];

/** A new reason needs its own text, so the type is exhaustive. */
const UNRECORDED_CAUSES: Record<UnrecordedReason, string> = {
	noOwnerProject: 'the workflow has no owner project',
};

function assertTransaction(ctx: OperationContext) {
	if (!ctx.trx) throw new UnexpectedError('A ledger insert needs an active transaction');
}
