import type { Logger } from '@n8n/backend-common';
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

import type { ExecutionLedgerRepository } from '../../database/repositories/execution-ledger.repository';
import { ExecutionLedgerFoldService, FOLD_BATCH_SIZE } from '../execution-ledger-fold.service';
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

describe('ExecutionLedgerFoldService', () => {
	const ctx = { trx: {} } as unknown as OperationContext;

	let scopedLogger: ReturnType<typeof mock<Logger>>;
	let errorReporter: ReturnType<typeof mock<ErrorReporter>>;
	let dbLockService: ReturnType<typeof mock<DbLockService>>;
	let repository: ReturnType<typeof mock<ExecutionLedgerRepository>>;
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

	beforeEach(() => {
		vi.mocked(withSavepoint).mockClear();
		scopedLogger = mock<Logger>();
		errorReporter = mock<ErrorReporter>();
		dbLockService = mock<DbLockService>();
		repository = mock<ExecutionLedgerRepository>();
		tryWithLockContext = dbLockService.tryWithLockContext;
		claimBatch = repository.claimBatch;
		tryWithLockContext.mockImplementation(async (_key, fn) => await fn(ctx));
		claimBatch.mockResolvedValue(rowsOf(2));
		registry = new FoldStepRegistry();
		service = new ExecutionLedgerFoldService(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) }),
			errorReporter,
			dbLockService,
			repository,
			registry,
		);
	});

	describe('foldBatch', () => {
		it('returns 0 without locking or claiming when no step is registered', async () => {
			expect(await service.foldBatch()).toBe(0);

			expect(tryWithLockContext).not.toHaveBeenCalled();
			expect(claimBatch).not.toHaveBeenCalled();
		});

		it('returns 0 and runs no step when the claim is empty', async () => {
			const step = addStep('first');
			claimBatch.mockResolvedValue([]);

			expect(await service.foldBatch()).toBe(0);

			expect(step.fold).not.toHaveBeenCalled();
			expect(withSavepoint).not.toHaveBeenCalled();
		});

		it('runs steps in registration order, each in a savepoint, and returns the row count', async () => {
			const rows = rowsOf(3);
			claimBatch.mockResolvedValue(rows);
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

		describe('attempt counter', () => {
			const attemptOf = async () =>
				await service.foldBatch().then(
					() => undefined,
					(e: FoldStepFailedError) => e.attempt,
				);

			let fail: boolean;
			const setFail = (value: boolean) => {
				fail = value;
			};

			beforeEach(() => {
				setFail(true);
				addStep('flaky', async () => {
					if (fail) throw new Error('nope');
					return await Promise.resolve(undefined);
				});
			});

			it('counts up while the same batch keeps failing', async () => {
				expect(await attemptOf()).toBe(1);
				expect(await attemptOf()).toBe(2);
			});

			it('resets to 1 when the first row id differs', async () => {
				await attemptOf();
				await attemptOf();
				claimBatch.mockResolvedValue(rowsOf(2, '100'));

				expect(await attemptOf()).toBe(1);
			});

			it('resets after a successful fold', async () => {
				await attemptOf();
				setFail(false);
				await service.foldBatch();
				setFail(true);

				expect(await attemptOf()).toBe(1);
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
