import { testDb, testModules } from '@n8n/backend-test-utils';
import { FoldTransactionLostError, TransactionRunner, withSavepoint } from '@n8n/db';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';

import { ledgerRow } from './ledger-rows';
import { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';

describe('withSavepoint', () => {
	let repository: ExecutionLedgerRepository;
	let txRunner: TransactionRunner;

	const remainingExecutionIds = async () =>
		await txRunner.run({}, async (ctx) =>
			(await repository.claimBatch(100, ctx)).map((r) => r.executionId),
		);

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], {
			'execution-ledger': async () => await import('../execution-ledger.module.js'),
		});
		await testDb.init();
		repository = Container.get(ExecutionLedgerRepository);
		txRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionLedgerEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('keeps the writes of a step that succeeds', async () => {
		await txRunner.run({}, async (ctx) => {
			await withSavepoint(ctx, 'first', async (stepCtx) => {
				await repository.append(ledgerRow({ executionId: 'kept' }), stepCtx);
			});
		});

		expect(await remainingExecutionIds()).toEqual(['kept']);
	});

	it('undoes only the failed step and keeps the transaction usable', async () => {
		await txRunner.run({}, async (ctx) => {
			await repository.append(ledgerRow({ executionId: 'before' }), ctx);

			await expect(
				withSavepoint(ctx, 'failing', async (stepCtx) => {
					await repository.append(ledgerRow({ executionId: 'undone' }), stepCtx);
					// Breaks the started-outcome CHECK constraint.
					await repository.append(
						ledgerRow({ executionId: 'invalid', outcome: 'success' }),
						stepCtx,
					);
				}),
			).rejects.toThrow();

			await withSavepoint(ctx, 'after', async (stepCtx) => {
				await repository.append(ledgerRow({ executionId: 'after' }), stepCtx);
			});
		});

		expect(await remainingExecutionIds()).toEqual(['before', 'after']);
	});

	it('undoes a failed step even after a same-named nested step failed inside it', async () => {
		await txRunner.run({}, async (ctx) => {
			await expect(
				withSavepoint(ctx, 'step', async (outerCtx) => {
					await repository.append(ledgerRow({ executionId: 'outer' }), outerCtx);
					await withSavepoint(outerCtx, 'step', async () => {
						throw new Error('inner failed');
					}).catch(() => {});
					throw new Error('outer failed');
				}),
			).rejects.toThrow('outer failed');
		});

		expect(await remainingExecutionIds()).toEqual([]);
	});

	it('throws FoldTransactionLostError when the transaction ended inside the step', async () => {
		const error = await txRunner
			.run({}, async (ctx) => {
				await withSavepoint(ctx, 'lost', async (stepCtx) => {
					// Ends the transaction, as SQLite does by itself on a full disk.
					const manager: EntityManager = repository['table'].managerFor(stepCtx);
					await manager.query('ROLLBACK');
					throw new Error('database or disk is full');
				});
			})
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(FoldTransactionLostError);
		expect(error).toHaveProperty('cause.message', 'database or disk is full');
		expect(error).toHaveProperty('extra.statement', 'ROLLBACK TO SAVEPOINT fold_step_lost');
	});
});
