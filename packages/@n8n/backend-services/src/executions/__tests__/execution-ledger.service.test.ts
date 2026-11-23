import type { Logger } from '@n8n/backend-common';
import type { Transaction } from '@n8n/db';
import { UnexpectedError } from '@n8n/errors';
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
const withOwner = { hasOwnerProject: true };
const withoutOwner = { hasOwnerProject: false };
const noProjectMessage =
	'The run is in the execution ledger with no project: the workflow has no owner project';

describe('ExecutionLedger', () => {
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const writer = mock<ExecutionLedgerWriter>();
	let ledger: ExecutionLedger;

	beforeEach(() => {
		vi.resetAllMocks();
		writer.writeStarted.mockResolvedValue(withOwner);
		writer.writeEnded.mockResolvedValue(withOwner);
		ledger = new ExecutionLedger(logger, errorReporter);
	});

	describe('without a writer', () => {
		it('does nothing', async () => {
			await expect(ledger.recordStarted(startedFacts, txCtx)).resolves.toBeUndefined();
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
			await expect(ledger.recordStarted(startedFacts, txCtx)).resolves.toBeUndefined();
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

		it('logs and reports a row written with no project', async () => {
			writer.writeStarted.mockResolvedValue(withoutOwner);

			await expect(ledger.recordStarted(startedFacts, txCtx)).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				'Execution exec-1 of workflow wf-1 is in the execution ledger with no project: the workflow has no owner project',
				{ executionId: 'exec-1', workflowId: 'wf-1' },
			);
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ message: noProjectMessage }),
				{ shouldBeLogged: false },
			);
		});

		it('logs and reports an ended row written with no project', async () => {
			writer.writeEnded.mockResolvedValue(withoutOwner);

			await ledger.recordEndedInTransaction(endedFacts, txCtx);

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ message: noProjectMessage }),
				{ shouldBeLogged: false },
			);
		});

		it('does not log or report rows written with a project', async () => {
			await ledger.recordStarted(startedFacts, txCtx);
			await ledger.recordEndedInTransaction(endedFacts, txCtx);

			expect(logger.error).not.toHaveBeenCalled();
			expect(errorReporter.error).not.toHaveBeenCalled();
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

		it('writes both rows and reports each when a run created finished has no owner project', async () => {
			writer.writeStarted.mockResolvedValue(withoutOwner);
			writer.writeEnded.mockResolvedValue(withoutOwner);

			await ledger.recordCreated({ started: startedFacts, status: 'error' }, txCtx);

			expect(writer.writeStarted).toHaveBeenCalledOnce();
			expect(writer.writeEnded).toHaveBeenCalledOnce();
			expect(logger.error).toHaveBeenCalledTimes(2);
			expect(errorReporter.error).toHaveBeenCalledTimes(2);
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

		it('reports a reclaimed tombstone whose ended row has no owner project', async () => {
			writer.writeEnded.mockResolvedValue(withoutOwner);

			await ledger.recordCreated(
				{ started: startedFacts, status: 'new', reclaimedTombstone: tombstone },
				txCtx,
			);

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ message: noProjectMessage }),
				{ shouldBeLogged: false },
			);
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

		it('logs and reports a row written with no project', async () => {
			writer.writeEnded.mockResolvedValue(withoutOwner);

			await ledger.recordEnded(endedFacts);

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				'Execution exec-1 of workflow wf-1 is in the execution ledger with no project: the workflow has no owner project',
				{ executionId: 'exec-1', workflowId: 'wf-1' },
			);
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ message: noProjectMessage }),
				{ shouldBeLogged: false },
			);
		});

		it('does not log or report a row written with a project', async () => {
			await ledger.recordEnded(endedFacts);

			expect(logger.error).not.toHaveBeenCalled();
			expect(errorReporter.error).not.toHaveBeenCalled();
		});
	});

	describe('recordEndedInSequence', () => {
		const second = { ...endedFacts, executionId: 'exec-2' };
		const third = { ...endedFacts, executionId: 'exec-3' };

		const deferred = () => {
			let resolve!: (value: typeof withOwner) => void;
			const promise = new Promise<typeof withOwner>((r) => {
				resolve = r;
			});
			return { promise, resolve };
		};
		const flush = async () => await new Promise((r) => setImmediate(r));

		it('does nothing without a writer', async () => {
			await expect(ledger.recordEndedInSequence([endedFacts])).resolves.toBeUndefined();

			expect(writer.writeEnded).not.toHaveBeenCalled();
		});

		it('does nothing for an empty list', async () => {
			ledger.setImplementation(writer);

			await ledger.recordEndedInSequence([]);

			expect(writer.writeEnded).not.toHaveBeenCalled();
		});

		it('writes the rows one at a time', async () => {
			ledger.setImplementation(writer);
			const first = deferred();
			writer.writeEnded.mockReturnValueOnce(first.promise);

			const done = ledger.recordEndedInSequence([endedFacts, second]);
			await flush();

			expect(writer.writeEnded).toHaveBeenCalledTimes(1);

			first.resolve(withOwner);
			await done;

			expect(writer.writeEnded).toHaveBeenCalledTimes(2);
			expect(writer.writeEnded).toHaveBeenNthCalledWith(1, endedFacts, {});
			expect(writer.writeEnded).toHaveBeenNthCalledWith(2, second, {});
		});

		it('keeps the order across two calls', async () => {
			ledger.setImplementation(writer);
			const first = deferred();
			writer.writeEnded.mockReturnValueOnce(first.promise);

			const one = ledger.recordEndedInSequence([endedFacts, second]);
			const two = ledger.recordEndedInSequence([third]);
			await flush();

			expect(writer.writeEnded).toHaveBeenCalledTimes(1);

			first.resolve(withOwner);
			await Promise.all([one, two]);

			expect(writer.writeEnded.mock.calls.map(([facts]) => facts.executionId)).toEqual([
				'exec-1',
				'exec-2',
				'exec-3',
			]);
		});

		it('settles a call only after its own rows are written', async () => {
			ledger.setImplementation(writer);
			const gate = deferred();
			writer.writeEnded.mockReturnValueOnce(gate.promise);
			let settled = false;

			const done = ledger.recordEndedInSequence([endedFacts]).then(() => (settled = true));
			await flush();

			expect(settled).toBe(false);

			gate.resolve(withOwner);
			await done;

			expect(settled).toBe(true);
		});

		it('writes the next rows after a failed write and does not reject', async () => {
			ledger.setImplementation(writer);
			writer.writeEnded.mockRejectedValueOnce(new Error('insert failed'));

			await expect(ledger.recordEndedInSequence([endedFacts, second])).resolves.toBeUndefined();
			await ledger.recordEndedInSequence([third]);

			expect(writer.writeEnded).toHaveBeenCalledTimes(3);
			expect(logger.error).toHaveBeenCalledTimes(1);
		});
	});

	describe('getBacklogStats', () => {
		it('returns what the bound writer resolves', async () => {
			const stats = { rows: 3, oldestOccurredAt: new Date('2026-10-30T10:00:00Z') };
			writer.getBacklogStats.mockResolvedValue(stats);
			ledger.setImplementation(writer);

			await expect(ledger.getBacklogStats()).resolves.toBe(stats);
		});

		it('throws UnexpectedError when no writer is bound', async () => {
			await expect(ledger.getBacklogStats()).rejects.toThrow(UnexpectedError);
		});
	});
});
