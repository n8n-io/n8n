import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import {
	type AfterFoldCommit,
	DbLockUnavailableError,
	type DbLockService,
	type ExecutionLedgerFoldStep,
	type ExecutionLedgerRow,
	FoldStepRegistry,
	FoldTransactionLostError,
	type OperationContext,
	withSavepoint,
} from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { fakeFailureStreaks } from '../../__tests__/fake-failure-streaks';
import type { RawLedgerRow } from '../../database/ledger-row.parser';
import type { ExecutionLedgerParkedRepository } from '../../database/repositories/execution-ledger-parked.repository';
import type { ExecutionLedgerRepository } from '../../database/repositories/execution-ledger.repository';
import {
	ExecutionLedgerFoldService,
	FOLD_BATCH_SIZE,
	FOLD_FAILURE_ALERT_THRESHOLD,
} from '../execution-ledger-fold.service';
import type { FoldFailureStreaks } from '../fold-failure-streaks';
import { FoldStepFailedError } from '../fold-step-failed.error';

vi.mock('@n8n/db', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/db')>()),
	withSavepoint: vi.fn(
		async (ctx: OperationContext, _name: string, fn: (c: OperationContext) => Promise<unknown>) =>
			await fn(ctx),
	),
}));

const rowsOf = (count: number, firstId = '1'): ExecutionLedgerRow[] =>
	Array.from(
		{ length: count },
		(_, i) => ({ id: String(Number(firstId) + i) }) as ExecutionLedgerRow,
	);

const unreadableOf = (...ids: string[]) => ids.map((id) => ({ id }) as unknown as RawLedgerRow);

describe('ExecutionLedgerFoldService', () => {
	const ctx = { trx: {} } as unknown as OperationContext;

	let scopedLogger: ReturnType<typeof mock<Logger>>;
	let errorReporter: ReturnType<typeof mock<ErrorReporter>>;
	let dbLockService: ReturnType<typeof mock<DbLockService>>;
	let repository: ReturnType<typeof mock<ExecutionLedgerRepository>>;
	let eventService: ReturnType<typeof mock<EventService>>;
	let parkedRepository: ReturnType<typeof mock<ExecutionLedgerParkedRepository>>;
	let streaks: ReturnType<typeof mock<FoldFailureStreaks>>;
	let registry: FoldStepRegistry;
	let service: ExecutionLedgerFoldService;
	let tryWithLockContext: typeof dbLockService.tryWithLockContext;
	let claimBatch: typeof repository.claimBatch;

	const addStep = (
		name: string,
		fold: ExecutionLedgerFoldStep['fold'] = async () => await Promise.resolve(undefined),
	) => {
		const step = { name, fold: vi.fn(fold) };
		registry.register(step);
		return step;
	};

	const lockHeld = () => new DbLockUnavailableError('1011');

	const claims = (rows: ExecutionLedgerRow[], unreadable: RawLedgerRow[] = []) => {
		claimBatch.mockResolvedValue({ rows, unreadable });
	};

	const buildService = () =>
		new ExecutionLedgerFoldService(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) }),
			errorReporter,
			dbLockService,
			repository,
			registry,
			eventService,
			parkedRepository,
			streaks,
		);

	const failingStep = (name: string, message = `${name} broke`) =>
		addStep(name, async () => {
			throw new Error(message);
		});

	const foldError = async (target: ExecutionLedgerFoldService = service) =>
		await target.foldBatch().then(
			() => undefined,
			(e: unknown) => e as FoldStepFailedError,
		);

	beforeEach(() => {
		vi.mocked(withSavepoint).mockClear();
		scopedLogger = mock<Logger>();
		errorReporter = mock<ErrorReporter>();
		dbLockService = mock<DbLockService>();
		repository = mock<ExecutionLedgerRepository>();
		eventService = mock<EventService>();
		parkedRepository = mock<ExecutionLedgerParkedRepository>();
		streaks = fakeFailureStreaks();
		tryWithLockContext = dbLockService.tryWithLockContext;
		claimBatch = repository.claimBatch;
		tryWithLockContext.mockImplementation(async (_key, fn) => await fn(ctx));
		claims(rowsOf(2));
		registry = new FoldStepRegistry();
		service = buildService();
	});

	describe('foldBatch', () => {
		it('returns 0 without locking or claiming when no step is registered', async () => {
			expect(await service.foldBatch()).toBe(0);

			expect(tryWithLockContext).not.toHaveBeenCalled();
			expect(claimBatch).not.toHaveBeenCalled();
		});

		it('returns 0 and runs no step when the claim is empty', async () => {
			const step = addStep('first');
			claims([]);

			expect(await service.foldBatch()).toBe(0);

			expect(step.fold).not.toHaveBeenCalled();
			expect(withSavepoint).not.toHaveBeenCalled();
		});

		it('runs steps in registration order, each in a savepoint, and returns the row count', async () => {
			const rows = rowsOf(3);
			claims(rows);
			const order: string[] = [];
			const a = addStep('alpha', async () => {
				order.push('alpha');
				return await Promise.resolve(undefined);
			});
			const b = addStep('beta', async () => {
				order.push('beta');
				return await Promise.resolve(undefined);
			});

			expect(await service.foldBatch()).toBe(3);

			expect(order).toEqual(['alpha', 'beta']);
			expect(vi.mocked(withSavepoint).mock.calls.map((c) => c[1])).toEqual(['alpha', 'beta']);
			expect(a.fold).toHaveBeenCalledWith(rows, ctx);
			expect(b.fold).toHaveBeenCalledWith(rows, ctx);
			expect(claimBatch).toHaveBeenCalledWith(FOLD_BATCH_SIZE, ctx);
		});

		it('runs after-commit work only after the lock call resolved, and only for steps that returned work', async () => {
			const events: string[] = [];
			tryWithLockContext.mockImplementation(async (_key, fn) => {
				const result = await fn(ctx);
				events.push('committed');
				return result;
			});
			addStep('with_work', async () => {
				events.push('fold');
				return await Promise.resolve(async () => {
					events.push('work');
				});
			});
			addStep('no_work');

			await service.foldBatch();

			expect(events).toEqual(['fold', 'committed', 'work']);
		});

		it('reports a throwing after-commit work, still runs the next one, and does not throw', async () => {
			const boom = new Error('boom');
			const second = vi.fn().mockResolvedValue(undefined);
			const works: AfterFoldCommit[] = [
				async () => {
					throw boom;
				},
				second,
			];
			addStep('one', async () => await Promise.resolve(works[0]));
			addStep('two', async () => await Promise.resolve(works[1]));

			await expect(service.foldBatch()).resolves.toBe(2);

			expect(errorReporter.error).toHaveBeenCalledWith(boom, { shouldBeLogged: true });
			expect(second).toHaveBeenCalled();
		});

		it('returns 0 without throwing when the lock is held', async () => {
			addStep('first');
			tryWithLockContext.mockRejectedValue(lockHeld());

			await expect(service.foldBatch()).resolves.toBe(0);
		});

		it('warns once after 5 consecutive lock skips', async () => {
			addStep('first');
			tryWithLockContext.mockRejectedValue(lockHeld());

			for (let i = 0; i < 4; i++) await service.foldBatch();
			expect(scopedLogger.warn).not.toHaveBeenCalled();

			await service.foldBatch();
			expect(scopedLogger.warn).toHaveBeenCalledTimes(1);
		});

		it('restarts the skip count after a batch gets the lock', async () => {
			addStep('first');
			tryWithLockContext.mockRejectedValue(lockHeld());
			for (let i = 0; i < 4; i++) await service.foldBatch();

			tryWithLockContext.mockImplementationOnce(async (_key, fn) => await fn(ctx));
			await service.foldBatch();
			for (let i = 0; i < 4; i++) await service.foldBatch();

			expect(scopedLogger.warn).not.toHaveBeenCalled();
		});

		it('throws FoldStepFailedError with step and cause, and skips later steps and after-commit work', async () => {
			const cause = new Error('step broke');
			const work = vi.fn().mockResolvedValue(undefined);
			addStep('good', async () => await Promise.resolve(work));
			addStep('bad', async () => {
				throw cause;
			});
			const later = addStep('later');

			const error = await service.foldBatch().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(FoldStepFailedError);
			expect(error).toMatchObject({ step: 'bad', attempt: 1, cause });
			expect(later.fold).not.toHaveBeenCalled();
			expect(work).not.toHaveBeenCalled();
		});

		describe('when a step fails', () => {
			it.each([1, 2])('throws attempt %i, saves the streak and does not park', async (attempt) => {
				failingStep('bad');
				for (let i = 1; i < attempt; i++) await foldError();

				const error = await foldError();

				expect(error).toBeInstanceOf(FoldStepFailedError);
				expect(error).toMatchObject({ step: 'bad', attempt, firstLedgerId: '1' });
				expect(streaks.set).toHaveBeenLastCalledWith('bad', '1', attempt);
				expect(parkedRepository.park).not.toHaveBeenCalled();
			});

			it('skips later steps and after-commit work on a failure that throws', async () => {
				const work = vi.fn().mockResolvedValue(undefined);
				addStep('good', async () => await Promise.resolve(work));
				failingStep('bad');
				const later = addStep('later');

				await foldError();

				expect(later.fold).not.toHaveBeenCalled();
				expect(work).not.toHaveBeenCalled();
			});

			it('parks the claimed rows on the third failure and does not throw', async () => {
				const rows = rowsOf(3);
				claims(rows);
				failingStep('bad', 'upsert failed');
				await foldError();
				await foldError();

				await expect(service.foldBatch()).resolves.toBe(3);

				expect(FOLD_FAILURE_ALERT_THRESHOLD).toBe(3);
				expect(parkedRepository.park).toHaveBeenCalledTimes(1);
				expect(parkedRepository.park).toHaveBeenCalledWith('bad', rows, 'upsert failed', ctx);
			});

			it('parks with the string form of a cause that is not an Error', async () => {
				registry.register({ name: 'bad', fold: vi.fn().mockRejectedValue('plain text') });
				await foldError();
				await foldError();

				await service.foldBatch();

				expect(parkedRepository.park).toHaveBeenCalledWith(
					'bad',
					expect.anything(),
					'plain text',
					ctx,
				);
			});

			it('runs the next step after parking and does not save the streak', async () => {
				failingStep('bad');
				const later = addStep('later');
				await foldError();
				await foldError();
				vi.mocked(streaks.set).mockClear();
				later.fold.mockClear();

				await service.foldBatch();

				expect(later.fold).toHaveBeenCalledTimes(1);
				expect(streaks.set).not.toHaveBeenCalled();
			});

			it('runs the after-commit work of a step that did not fail when another step parks', async () => {
				const otherWork = vi.fn().mockResolvedValue(undefined);
				failingStep('bad');
				addStep('other', async () => await Promise.resolve(otherWork));
				await foldError();
				await foldError();

				await service.foldBatch();

				expect(otherWork).toHaveBeenCalledTimes(1);
			});

			it('parks each of two failing steps when its own count reaches three', async () => {
				failingStep('first');
				failingStep('second');

				await expect(foldError()).resolves.toMatchObject({ step: 'first', attempt: 1 });
				await expect(foldError()).resolves.toMatchObject({ step: 'first', attempt: 2 });
				// The first step parks and the second one fails for the first time.
				await expect(foldError()).resolves.toMatchObject({ step: 'second', attempt: 1 });
				expect(parkedRepository.park).toHaveBeenCalledTimes(1);
				await expect(foldError()).resolves.toMatchObject({ step: 'second', attempt: 2 });

				await expect(service.foldBatch()).resolves.toBe(2);

				expect(parkedRepository.park.mock.calls.map((c) => c[0])).toEqual([
					'first',
					'first',
					'first',
					'second',
				]);
			});

			it('counts the failures of one batch and starts at 1 for another first row id', async () => {
				failingStep('bad');
				await foldError();
				await foldError();
				claims(rowsOf(2, '100'));

				const error = await foldError();

				expect(error).toMatchObject({ attempt: 1, firstLedgerId: '100' });
				expect(parkedRepository.park).not.toHaveBeenCalled();
			});

			it('reaches the threshold on a second service that shares the streak store', async () => {
				failingStep('bad');
				const otherMain = buildService();
				await foldError();
				await foldError(otherMain);

				await expect(service.foldBatch()).resolves.toBe(2);

				expect(parkedRepository.park).toHaveBeenCalledTimes(1);
			});

			it('rethrows a lost transaction as is when the count is already 2', async () => {
				addStep('bad');
				const later = addStep('later');
				await streaks.set('bad', '1', 2);
				const lost = new FoldTransactionLostError('ROLLBACK TO', new Error('a'), new Error('b'));
				vi.mocked(withSavepoint).mockRejectedValueOnce(lost);

				await expect(service.foldBatch()).rejects.toBe(lost);

				expect(parkedRepository.park).not.toHaveBeenCalled();
				expect(later.fold).not.toHaveBeenCalled();
			});

			it('rejects when parking fails', async () => {
				const parkFailure = new Error('insert failed');
				parkedRepository.park.mockRejectedValue(parkFailure);
				failingStep('bad');
				await foldError();
				await foldError();

				await expect(service.foldBatch()).rejects.toBe(parkFailure);
			});
		});

		describe('unreadable rows', () => {
			it('parks them as unreadable and runs no step when they are all there is', async () => {
				const unreadable = unreadableOf('7', '8');
				claims([], unreadable);
				const step = addStep('first');

				await expect(service.foldBatch()).resolves.toBe(2);

				expect(parkedRepository.parkUnreadable).toHaveBeenCalledWith(unreadable, ctx);
				expect(step.fold).not.toHaveBeenCalled();
			});

			it('parks them before any step runs and gives the steps only the readable rows', async () => {
				const rows = rowsOf(2);
				const unreadable = unreadableOf('9');
				claims(rows, unreadable);
				const order: string[] = [];
				parkedRepository.parkUnreadable.mockImplementation(async () => {
					order.push('park');
					await Promise.resolve();
				});
				const step = addStep('first', async () => {
					order.push('fold');
					return await Promise.resolve(undefined);
				});

				await expect(service.foldBatch()).resolves.toBe(3);

				expect(order).toEqual(['park', 'fold']);
				expect(step.fold).toHaveBeenCalledWith(rows, ctx);
			});

			it('logs them once after the commit', async () => {
				claims(rowsOf(1), unreadableOf('9', '10'));
				addStep('first');

				await service.foldBatch();

				expect(scopedLogger.error).toHaveBeenCalledTimes(1);
				expect(scopedLogger.error).toHaveBeenCalledWith(expect.any(String), { rows: 2 });
			});

			it('does not log them when the batch rolls back', async () => {
				claims(rowsOf(1), unreadableOf('9'));
				failingStep('bad');

				await foldError();

				expect(scopedLogger.error).not.toHaveBeenCalled();
			});
		});

		describe('after a park', () => {
			const parkAfterTwoFailures = async () => {
				claims(rowsOf(3, '5'));
				failingStep('bad', 'upsert failed');
				await foldError();
				await foldError();
				scopedLogger.error.mockClear();
				errorReporter.error.mockClear();
				await service.foldBatch();
			};

			it('logs one error with the step, attempt, first ledger id and row count', async () => {
				await parkAfterTwoFailures();

				expect(scopedLogger.error).toHaveBeenCalledTimes(1);
				expect(scopedLogger.error).toHaveBeenCalledWith(expect.any(String), {
					step: 'bad',
					attempt: 3,
					firstLedgerId: '5',
					rows: 3,
				});
			});

			it('counts only the readable rows in the log', async () => {
				claims(rowsOf(3), unreadableOf('9'));
				failingStep('bad');
				await foldError();
				await foldError();
				scopedLogger.error.mockClear();

				await service.foldBatch();

				expect(scopedLogger.error).toHaveBeenCalledWith(expect.any(String), {
					step: 'bad',
					attempt: 3,
					firstLedgerId: '1',
					rows: 3,
				});
			});

			it('reports one FoldStepFailedError without logging it again', async () => {
				await parkAfterTwoFailures();

				expect(errorReporter.error).toHaveBeenCalledTimes(1);
				expect(errorReporter.error).toHaveBeenCalledWith(expect.any(FoldStepFailedError), {
					shouldBeLogged: false,
				});
				expect(errorReporter.error.mock.calls[0][0]).toMatchObject({ step: 'bad', attempt: 3 });
			});

			it('logs and reports nothing on the failures that throw', async () => {
				failingStep('bad');

				await foldError();
				await foldError();

				expect(scopedLogger.error).not.toHaveBeenCalled();
				expect(errorReporter.error).not.toHaveBeenCalled();
			});

			it('emits step-failed on every failure and succeeded on the parking run', async () => {
				failingStep('bad');

				await foldError();
				await foldError();
				await service.foldBatch();

				const names = eventService.emit.mock.calls.map(([name]) => name);
				expect(names).toEqual([
					'execution-ledger-fold-step-failed',
					'execution-ledger-fold-step-failed',
					'execution-ledger-fold-step-failed',
					'execution-ledger-fold-succeeded',
				]);
			});
		});

		it('rethrows FoldTransactionLostError as is and does not count it as a lock skip', async () => {
			addStep('first');
			const lost = new FoldTransactionLostError('ROLLBACK TO', new Error('a'), new Error('b'));
			vi.mocked(withSavepoint).mockRejectedValueOnce(lost);

			await expect(service.foldBatch()).rejects.toBe(lost);

			for (let i = 0; i < 4; i++) {
				tryWithLockContext.mockRejectedValueOnce(lockHeld());
				await service.foldBatch();
			}
			expect(scopedLogger.warn).not.toHaveBeenCalled();
		});
	});

	describe('metrics events', () => {
		const emitted = (event: string) =>
			eventService.emit.mock.calls.filter(([name]) => name === event);

		it.each([
			['a committed batch', rowsOf(3), 3],
			['an empty claim', [], 0],
		])('emits succeeded with the row count after %s', async (_case, rows, count) => {
			addStep('first');
			claims(rows);

			await service.foldBatch();

			expect(eventService.emit).toHaveBeenCalledWith('execution-ledger-fold-succeeded', {
				rows: count,
			});
		});

		it('emits nothing when no step is registered', async () => {
			await service.foldBatch();

			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('emits nothing when the lock is held', async () => {
			addStep('first');
			tryWithLockContext.mockRejectedValue(lockHeld());

			await service.foldBatch();

			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('emits step-failed with the step, and not succeeded', async () => {
			failingStep('bad', 'step broke');

			await foldError();

			expect(eventService.emit).toHaveBeenCalledWith('execution-ledger-fold-step-failed', {
				step: 'bad',
			});
			expect(emitted('execution-ledger-fold-succeeded')).toHaveLength(0);
		});

		it('carries firstLedgerId and the fold step tag on the thrown error', async () => {
			failingStep('bad');
			claims(rowsOf(2, '42'));

			const error = await foldError();

			expect(error?.firstLedgerId).toBe('42');
			expect(error?.tags).toMatchObject({ foldStep: 'bad' });
		});

		it('still resolves with the row count when emit throws after a commit', async () => {
			addStep('first');
			claims(rowsOf(4));
			eventService.emit.mockImplementation(() => {
				throw new Error('listener broke');
			});

			await expect(service.foldBatch()).resolves.toBe(4);
		});
	});

	describe('fold', () => {
		let foldBatch: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.useFakeTimers();
			foldBatch = vi.spyOn(service, 'foldBatch');
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('stops after a partial batch', async () => {
			foldBatch.mockResolvedValue(FOLD_BATCH_SIZE - 1);

			await service.fold(new AbortController().signal);

			expect(foldBatch).toHaveBeenCalledTimes(1);
		});

		it('loops while batches are full and stops at the first partial one', async () => {
			foldBatch
				.mockResolvedValueOnce(FOLD_BATCH_SIZE)
				.mockResolvedValueOnce(FOLD_BATCH_SIZE)
				.mockResolvedValueOnce(10);

			const done = service.fold(new AbortController().signal);
			await vi.runAllTimersAsync();
			await done;

			expect(foldBatch).toHaveBeenCalledTimes(3);
		});

		it('does not start a batch when the signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			await service.fold(controller.signal);

			expect(foldBatch).not.toHaveBeenCalled();
		});

		it('stops when the signal aborts during the pause between batches', async () => {
			const controller = new AbortController();
			foldBatch.mockResolvedValue(FOLD_BATCH_SIZE);

			const done = service.fold(controller.signal);
			await vi.advanceTimersByTimeAsync(10);
			controller.abort();
			await vi.runAllTimersAsync();
			await done;

			expect(foldBatch).toHaveBeenCalledTimes(1);
		});

		it('stops after one full batch when the budget has no room for another', async () => {
			foldBatch.mockResolvedValue(FOLD_BATCH_SIZE);

			await service.fold(new AbortController().signal, 0);

			expect(foldBatch).toHaveBeenCalledTimes(1);
		});
	});
});
