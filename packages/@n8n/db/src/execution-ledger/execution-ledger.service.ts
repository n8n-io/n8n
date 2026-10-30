import { Logger } from '@n8n/backend-common';
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
import type { OperationContext } from '../services/transaction';

/**
 * Records run events in the execution ledger. Does nothing until the `execution-ledger` module
 * binds a writer, so core code can call it without importing the module.
 */
@Service()
export class ExecutionLedger {
	private writer?: ExecutionLedgerWriter;

	private readonly pendingEnded = new Set<Promise<void>>();

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

	/** Inserts in the transaction of the execution row, so a failed insert rolls the run back. */
	async recordStarted(facts: ExecutionLedgerStartedFacts, ctx: OperationContext): Promise<void> {
		if (!this.writer) return;
		assertTransaction(ctx);

		this.reportUnrecorded(await this.writer.writeStarted(facts, ctx), facts);
	}

	async recordEndedInTransaction(
		facts: ExecutionLedgerEndedFacts,
		ctx: OperationContext,
	): Promise<void> {
		if (!this.writer) return;
		assertTransaction(ctx);

		this.reportUnrecorded(await this.writer.writeEnded(facts, ctx), facts);
	}

	/** Never rejects. Callers that can wait should await it, the rest can drop it. */
	async recordEnded(facts: ExecutionLedgerEndedFacts): Promise<void> {
		if (!this.writer) return;

		const pending = this.writeEnded(this.writer, facts);
		this.pendingEnded.add(pending);
		try {
			await pending;
		} finally {
			this.pendingEnded.delete(pending);
		}
	}

	/** Waits for every `recordEnded` insert, including those that start during the wait. */
	async drain(): Promise<void> {
		while (this.pendingEnded.size > 0) {
			await Promise.allSettled([...this.pendingEnded]);
		}
	}

	private async writeEnded(writer: ExecutionLedgerWriter, facts: ExecutionLedgerEndedFacts) {
		try {
			this.reportUnrecorded(await writer.writeEnded(facts, {}), facts);
		} catch (e) {
			const error = ensureError(e);
			const meta = { executionId: facts.executionId, workflowId: facts.workflowId };
			this.logger.error('Failed to record a run end in the execution ledger', {
				...meta,
				error: error.message,
			});
			this.errorReporter.error(error, { extra: meta, shouldBeLogged: false });
		}
	}

	private reportUnrecorded(
		result: ExecutionLedgerWriteResult,
		{ executionId, workflowId }: ExecutionLedgerStartedFacts,
	) {
		if (result.recorded) return;

		const message = 'The workflow has no owner project, so the run is not in the execution ledger';
		this.logger.error(message, { executionId, workflowId });
		this.errorReporter.error(new UnexpectedError(message, { extra: { executionId, workflowId } }), {
			shouldBeLogged: false,
		});
	}
}

function assertTransaction(ctx: OperationContext) {
	if (!ctx.trx) throw new UnexpectedError('A ledger insert needs an active transaction');
}
