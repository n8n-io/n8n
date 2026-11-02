import type { Logger } from '@n8n/backend-common';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Transaction } from '../../services/transaction';
import type {
	ExecutionLedgerEndedFacts,
	ExecutionLedgerStartedFacts,
	ExecutionLedgerWriter,
} from '../execution-ledger-writer';
import { ExecutionLedger } from '../execution-ledger.service';

const startedFacts: ExecutionLedgerStartedFacts = {
	executionId: 'exec-1',
	workflowId: 'wf-1',
	workflowName: 'Nightly sync',
	mode: 'trigger',
	occurredAt: new Date('2026-10-30T10:00:00Z'),
};
const endedFacts: ExecutionLedgerEndedFacts = {
	...startedFacts,
	outcome: 'success',
	runtimeMs: 10,
	timeSavedMin: 0,
};
const txCtx = { trx: mock<Transaction>() };

describe('ExecutionLedger', () => {
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const writer = mock<ExecutionLedgerWriter>();
	let ledger: ExecutionLedger;

	beforeEach(() => {
		vi.resetAllMocks();
		writer.writeStarted.mockResolvedValue({ recorded: true });
		writer.writeEnded.mockResolvedValue({ recorded: true });
		ledger = new ExecutionLedger(logger, errorReporter);
	});

	describe('without a writer', () => {
		it('does nothing', async () => {
			await ledger.recordStarted(startedFacts, {});
			await ledger.recordEndedInTransaction(endedFacts, {});
			await ledger.recordEnded(endedFacts);

			expect(ledger.isEnabled).toBe(false);
			expect(logger.error).not.toHaveBeenCalled();
		});
	});

	describe('setImplementation', () => {
		it('rejects a second writer', () => {
			ledger.setImplementation(writer);

			expect(ledger.isEnabled).toBe(true);
			expect(() => ledger.setImplementation(writer)).toThrow(
				'An execution ledger writer is already registered',
			);
		});
	});

	describe('in a transaction', () => {
		beforeEach(() => ledger.setImplementation(writer));

		it('passes the context to the writer', async () => {
			await ledger.recordStarted(startedFacts, txCtx);
			await ledger.recordEndedInTransaction(endedFacts, txCtx);

			expect(writer.writeStarted).toHaveBeenCalledWith(startedFacts, txCtx);
			expect(writer.writeEnded).toHaveBeenCalledWith(endedFacts, txCtx);
		});

		it('rejects a context without a transaction', async () => {
			await expect(ledger.recordStarted(startedFacts, {})).rejects.toThrow(
				'A ledger insert needs an active transaction',
			);
			await expect(ledger.recordEndedInTransaction(endedFacts, {})).rejects.toThrow(
				'A ledger insert needs an active transaction',
			);
			expect(writer.writeStarted).not.toHaveBeenCalled();
		});

		it('rethrows a writer error', async () => {
			writer.writeStarted.mockRejectedValue(new Error('insert failed'));

			await expect(ledger.recordStarted(startedFacts, txCtx)).rejects.toThrow('insert failed');
		});

		it('logs and reports a workflow without an owner project', async () => {
			writer.writeStarted.mockResolvedValue({ recorded: false, reason: 'noOwnerProject' });

			await ledger.recordStarted(startedFacts, txCtx);

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				'Workflow wf-1 has no owner project, so execution exec-1 is not in the execution ledger',
				{ executionId: 'exec-1', workflowId: 'wf-1' },
			);
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					message: 'The workflow has no owner project, so the run is not in the execution ledger',
				}),
				{ shouldBeLogged: false },
			);
		});
	});

	describe('recordEnded', () => {
		beforeEach(() => ledger.setImplementation(writer));

		it('writes without a transaction', async () => {
			await ledger.recordEnded(endedFacts);

			expect(writer.writeEnded).toHaveBeenCalledWith(endedFacts, {});
		});

		it('logs and reports a writer error and does not reject', async () => {
			const error = new Error('insert failed');
			writer.writeEnded.mockRejectedValue(error);

			await expect(ledger.recordEnded(endedFacts)).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				'Failed to record the end of execution exec-1 in the execution ledger: insert failed',
				{ executionId: 'exec-1', workflowId: 'wf-1', error },
			);
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(error, {
				extra: { executionId: 'exec-1', workflowId: 'wf-1' },
				shouldBeLogged: false,
			});
		});

		it('logs and reports a workflow without an owner project', async () => {
			writer.writeEnded.mockResolvedValue({ recorded: false, reason: 'noOwnerProject' });

			await ledger.recordEnded(endedFacts);

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});
	});
});
