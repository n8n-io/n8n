import type { Logger } from '@n8n/backend-common';
import type { Transaction } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

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
		writer.writeStarted.mockResolvedValue(true);
		writer.writeEnded.mockResolvedValue(true);
		ledger = new ExecutionLedger(logger, errorReporter);
	});

	describe('without a writer', () => {
		it('does nothing', async () => {
			await expect(ledger.recordStarted(startedFacts, txCtx)).resolves.toBe(false);
			await ledger.recordEndedInTransaction(endedFacts, txCtx);
			await ledger.recordEnded(endedFacts);

			expect(ledger.isEnabled).toBe(false);
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('rejects a context without a transaction', async () => {
			await expect(ledger.recordStarted(startedFacts, {})).rejects.toThrow(
				'A ledger insert needs an active transaction',
			);
			await expect(ledger.recordEndedInTransaction(endedFacts, {})).rejects.toThrow(
				'A ledger insert needs an active transaction',
			);
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
			await expect(ledger.recordStarted(startedFacts, txCtx)).resolves.toBe(true);
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
			writer.writeStarted.mockResolvedValue(false);

			await expect(ledger.recordStarted(startedFacts, txCtx)).resolves.toBe(false);

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				'Execution exec-1 of workflow wf-1 is not in the execution ledger: the workflow has no owner project',
				{ executionId: 'exec-1', workflowId: 'wf-1' },
			);
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					message: 'The run is not in the execution ledger: the workflow has no owner project',
				}),
				{ shouldBeLogged: false },
			);
		});
	});

	describe('recordCreated', () => {
		const blocked = { outcome: 'blocked', blockedBy: 'startFailed' };
		const tombstone = { executionId: 'exec-old', workflowId: 'wf-1', mode: 'trigger' } as const;

		beforeEach(() => ledger.setImplementation(writer));

		it('writes only the started row for a new run', async () => {
			await ledger.recordCreated({ started: startedFacts, status: 'new' }, txCtx);

			expect(writer.writeStarted).toHaveBeenCalledExactlyOnceWith(startedFacts, txCtx);
			expect(writer.writeEnded).not.toHaveBeenCalled();
		});

		it('ends a row created failed as blocked at its stop time', async () => {
			const stoppedAt = new Date('2026-10-30T10:00:05Z');

			await ledger.recordCreated({ started: startedFacts, status: 'error', stoppedAt }, txCtx);

			expect(writer.writeEnded).toHaveBeenCalledExactlyOnceWith(
				{ ...startedFacts, ...blocked, occurredAt: stoppedAt },
				txCtx,
			);
		});

		it('writes no ended row when the started row was not recorded', async () => {
			writer.writeStarted.mockResolvedValue(false);

			await ledger.recordCreated({ started: startedFacts, status: 'error' }, txCtx);

			expect(writer.writeEnded).not.toHaveBeenCalled();
		});

		it('reports a row created finished with work done and writes no ended row', async () => {
			await ledger.recordCreated(
				{ started: startedFacts, status: 'success', startedAt: new Date() },
				txCtx,
			);

			expect(writer.writeEnded).not.toHaveBeenCalled();
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					message: 'An execution row was created finished with work done',
				}),
			);
		});

		it('ends a reclaimed tombstone as blocked, with the name and time of the new run', async () => {
			await ledger.recordCreated(
				{
					started: { ...startedFacts, source: 'instance_ai' },
					status: 'new',
					reclaimedTombstone: tombstone,
				},
				txCtx,
			);

			expect(writer.writeEnded).toHaveBeenCalledExactlyOnceWith(
				{ ...startedFacts, ...tombstone, ...blocked, source: undefined },
				txCtx,
			);
			expect(writer.writeStarted).toHaveBeenCalledOnce();
		});

		it('writes only the tombstone row for a copied run', async () => {
			await ledger.recordCreated(
				{ started: startedFacts, status: 'error', isCopy: true, reclaimedTombstone: tombstone },
				txCtx,
			);

			expect(writer.writeStarted).not.toHaveBeenCalled();
			expect(writer.writeEnded).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ executionId: 'exec-old' }),
				txCtx,
			);
		});

		it('rejects a context without a transaction', async () => {
			await expect(
				ledger.recordCreated({ started: startedFacts, status: 'new' }, {}),
			).rejects.toThrow('A ledger insert needs an active transaction');
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
			writer.writeEnded.mockResolvedValue(false);

			await ledger.recordEnded(endedFacts);

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});
	});
});
