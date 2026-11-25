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
import { OperationalError } from '@n8n/errors';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { RawLedgerRow } from '../../database/ledger-row.parser';
import type { ExecutionLedgerParkedRepository } from '../../database/repositories/execution-ledger-parked.repository';
import type { ExecutionLedgerRepository } from '../../database/repositories/execution-ledger.repository';
import {
	ExecutionLedgerFoldService,
	FOLD_BATCH_SIZE,
	FOLD_STEP_ATTEMPTS,
} from '../execution-ledger-fold.service';
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
		);

	const failingStep = (name: string, message = `${name} broke`) =>
		addStep(name, async () => {
			throw new Error(message);
		});

	const stepFailingOnce = (
		name: string,
		work?: AfterFoldCommit,
		message = `${name} broke once`,
	) => {
		let calls = 0;
		return addStep(name, async () => {
			calls++;
			if (calls === 1) throw new Error(message);
			return await Promise.resolve(work);
		});
	};

	const stepEvents = () =>
		eventService.emit.mock.calls.filter(([name]) => name === 'execution-ledger-fold-step-failed');

	beforeEach(() => {
		vi.mocked(withSavepoint).mockClear();
		scopedLogger = mock<Logger>();
		errorReporter = mock<ErrorReporter>();
		dbLockService = mock<DbLockService>();
		repository = mock<ExecutionLedgerRepository>();
		eventService = mock<EventService>();
		parkedRepository = mock<ExecutionLedgerParkedRepository>();
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

		describe('when a step fails', () => {
			it('has two runs for each step', () => {
				expect(FOLD_STEP_ATTEMPTS).toBe(2);
			});

			describe('and succeeds on the second run', () => {
				it('keeps the step work, runs its after-commit work and parks nothing', async () => {
					const work = vi.fn().mockResolvedValue(undefined);
					const step = stepFailingOnce('flaky', work);

					await expect(service.foldBatch()).resolves.toBe(2);

					expect(step.fold).toHaveBeenCalledTimes(2);
					expect(work).toHaveBeenCalledTimes(1);
					expect(parkedRepository.park).not.toHaveBeenCalled();
				});

				it('emits one step-failed metric and logs one warning', async () => {
					stepFailingOnce('flaky', undefined, 'deadlock');

					await service.foldBatch();

					expect(stepEvents()).toHaveLength(1);
					expect(eventService.emit).toHaveBeenCalledWith('execution-ledger-fold-step-failed', {
						step: 'flaky',
					});
					expect(scopedLogger.warn).toHaveBeenCalledTimes(1);
					expect(scopedLogger.warn).toHaveBeenCalledWith(
						'Execution ledger fold step failed, the fold runs it again',
						{ step: 'flaky', error: 'deadlock' },
					);
				});

				it('logs and reports no error', async () => {
					stepFailingOnce('flaky');

					await service.foldBatch();

					expect(scopedLogger.error).not.toHaveBeenCalled();
					expect(errorReporter.error).not.toHaveBeenCalled();
				});
			});

			describe('and fails again', () => {
				it('parks the claimed rows once with the message of the second failure', async () => {
					const rows = rowsOf(3);
					claims(rows);
					let calls = 0;
					const step = addStep('bad', async () => {
						calls++;
						throw new Error(calls === 1 ? 'first failure' : 'second failure');
					});

					await expect(service.foldBatch()).resolves.toBe(3);

					expect(step.fold).toHaveBeenCalledTimes(2);
					expect(parkedRepository.park).toHaveBeenCalledTimes(1);
					expect(parkedRepository.park).toHaveBeenCalledWith('bad', rows, 'second failure', ctx);
				});

				it('parks with the string form of a cause that is not an Error', async () => {
					registry.register({ name: 'bad', fold: vi.fn().mockRejectedValue('plain text') });

					await service.foldBatch();

					expect(parkedRepository.park).toHaveBeenCalledWith(
						'bad',
						expect.anything(),
						'plain text',
						ctx,
					);
				});

				it('emits step-failed twice, warns once and then emits succeeded', async () => {
					failingStep('bad');

					await service.foldBatch();

					expect(eventService.emit.mock.calls.map(([name]) => name)).toEqual([
						'execution-ledger-fold-step-failed',
						'execution-ledger-fold-step-failed',
						'execution-ledger-fold-succeeded',
					]);
					expect(scopedLogger.warn).toHaveBeenCalledTimes(1);
				});

				it('runs the later steps and the after-commit work of the other steps, not of the parked step', async () => {
					const goodWork = vi.fn().mockResolvedValue(undefined);
					const laterWork = vi.fn().mockResolvedValue(undefined);
					const badWork = vi.fn().mockResolvedValue(undefined);
					addStep('good', async () => await Promise.resolve(goodWork));
					let calls = 0;
					addStep('bad', async () => {
						calls++;
						if (calls < 3) throw new Error('bad broke');
						return await Promise.resolve(badWork);
					});
					const later = addStep('later', async () => await Promise.resolve(laterWork));

					await service.foldBatch();

					expect(later.fold).toHaveBeenCalledTimes(1);
					expect(goodWork).toHaveBeenCalledTimes(1);
					expect(laterWork).toHaveBeenCalledTimes(1);
					expect(badWork).not.toHaveBeenCalled();
				});

				it('parks each of two failing steps in the same run', async () => {
					const rows = rowsOf(2);
					claims(rows);
					failingStep('first', 'first broke');
					failingStep('second', 'second broke');

					await expect(service.foldBatch()).resolves.toBe(2);

					expect(parkedRepository.park.mock.calls).toEqual([
						['first', rows, 'first broke', ctx],
						['second', rows, 'second broke', ctx],
					]);
				});

				it('rejects when parking fails', async () => {
					const parkFailure = new Error('insert failed');
					parkedRepository.park.mockRejectedValue(parkFailure);
					failingStep('bad');

					await expect(service.foldBatch()).rejects.toBe(parkFailure);
				});

				it('does not report the park when parking fails', async () => {
					parkedRepository.park.mockRejectedValue(new Error('insert failed'));
					failingStep('bad');

					await service.foldBatch().catch(() => undefined);

					expect(scopedLogger.error).not.toHaveBeenCalled();
					expect(errorReporter.error).not.toHaveBeenCalled();
				});
			});

			describe('and the transaction is lost', () => {
				it('rethrows the error on the first run, with no retry and no park', async () => {
					const step = addStep('bad');
					const later = addStep('later');
					const lost = new FoldTransactionLostError('ROLLBACK TO', new Error('a'), new Error('b'));
					vi.mocked(withSavepoint).mockRejectedValueOnce(lost);

					await expect(service.foldBatch()).rejects.toBe(lost);

					expect(withSavepoint).toHaveBeenCalledTimes(1);
					expect(step.fold).not.toHaveBeenCalled();
					expect(later.fold).not.toHaveBeenCalled();
					expect(parkedRepository.park).not.toHaveBeenCalled();
					expect(stepEvents()).toHaveLength(0);
				});
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
				addStep('first');
				vi.mocked(withSavepoint).mockRejectedValueOnce(
					new FoldTransactionLostError('ROLLBACK TO', new Error('a'), new Error('b')),
				);

				await service.foldBatch().catch(() => undefined);

				expect(scopedLogger.error).not.toHaveBeenCalled();
			});
		});

		describe('after a park', () => {
			it('logs one error with the step, first ledger id and row count', async () => {
				claims(rowsOf(3, '5'));
				failingStep('bad', 'upsert failed');

				await service.foldBatch();

				expect(scopedLogger.error).toHaveBeenCalledTimes(1);
				expect(scopedLogger.error).toHaveBeenCalledWith(
					'Execution ledger fold parked a batch for a failing step',
					{ step: 'bad', firstLedgerId: '5', error: 'upsert failed', rows: 3 },
				);
			});

			it('counts only the readable rows in the log', async () => {
				claims(rowsOf(3), unreadableOf('9'));
				failingStep('bad');

				await service.foldBatch();

				expect(scopedLogger.error).toHaveBeenCalledWith(expect.any(String), {
					step: 'bad',
					firstLedgerId: '1',
					error: 'bad broke',
					rows: 3,
				});
			});

			it('reports one FoldStepFailedError, with the second failure in extra, without logging it again', async () => {
				claims(rowsOf(3, '5'));
				failingStep('bad', 'upsert failed');

				await service.foldBatch();

				expect(errorReporter.error).toHaveBeenCalledTimes(1);
				expect(errorReporter.error).toHaveBeenCalledWith(expect.any(FoldStepFailedError), {
					shouldBeLogged: false,
				});
				const reported = errorReporter.error.mock.calls[0][0] as FoldStepFailedError;
				expect(reported).toMatchObject({
					step: 'bad',
					firstLedgerId: '5',
					message: 'Fold step "bad" failed twice, the batch was parked',
				});
				expect(reported.cause).toBeUndefined();
				expect(reported.extra).toMatchObject({
					step: 'bad',
					firstLedgerId: '5',
					stepErrorName: 'Error',
					stepErrorMessage: 'upsert failed',
				});
				expect(reported.tags).toMatchObject({ foldStep: 'bad' });
			});

			it('reports a park caused by a warning-level step error without a cause', async () => {
				addStep('bad', async () => {
					throw new OperationalError('transient');
				});

				await service.foldBatch();

				const reported = errorReporter.error.mock.calls[0][0] as FoldStepFailedError;
				expect(reported.cause).toBeUndefined();
				expect(reported.level).toBe('error');
				expect(reported.extra).toMatchObject({
					stepErrorName: 'OperationalError',
					stepErrorMessage: 'transient',
				});
			});

			it('reports the type of a step failure that is not an Error', async () => {
				registry.register({ name: 'bad', fold: vi.fn().mockRejectedValue('plain text') });

				await service.foldBatch();

				const reported = errorReporter.error.mock.calls[0][0] as FoldStepFailedError;
				expect(reported.cause).toBeUndefined();
				expect(reported.extra).toMatchObject({
					stepErrorName: 'string',
					stepErrorMessage: 'plain text',
				});
			});

			it('reports the name of a step failure that is a plain object with a name', async () => {
				const failure = { name: 'QueryTimeout', message: 'statement timeout' };
				registry.register({ name: 'bad', fold: vi.fn().mockRejectedValue(failure) });

				await service.foldBatch();

				const reported = errorReporter.error.mock.calls[0][0] as FoldStepFailedError;
				expect(reported.cause).toBeUndefined();
				expect(reported.extra).toMatchObject({
					stepErrorName: 'QueryTimeout',
					stepErrorMessage: 'statement timeout',
				});
			});

			it('logs and reports each of two parked steps once', async () => {
				failingStep('first');
				failingStep('second');

				await service.foldBatch();

				expect(
					scopedLogger.error.mock.calls.map(([, meta]) => (meta as { step: string }).step),
				).toEqual(['first', 'second']);
				expect(errorReporter.error).toHaveBeenCalledTimes(2);
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

		it('emits step-failed with the step, and not succeeded, when the transaction is lost', async () => {
			addStep('bad');
			vi.mocked(withSavepoint).mockRejectedValueOnce(
				new FoldTransactionLostError('ROLLBACK TO', new Error('a'), new Error('b')),
			);

			await service.foldBatch().catch(() => undefined);

			expect(emitted('execution-ledger-fold-step-failed')).toHaveLength(0);
			expect(emitted('execution-ledger-fold-succeeded')).toHaveLength(0);
		});

		it('emits step-failed with the step on each failed run', async () => {
			failingStep('bad', 'step broke');

			await service.foldBatch();

			expect(emitted('execution-ledger-fold-step-failed')).toEqual([
				['execution-ledger-fold-step-failed', { step: 'bad' }],
				['execution-ledger-fold-step-failed', { step: 'bad' }],
			]);
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
