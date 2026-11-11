import type { OperationContext, Transaction, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { afterCommit, runInTransaction } from '../after-commit';

describe('afterCommit', () => {
	const txRunner = mock<TransactionRunner>();
	const effect = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		// Open a transaction only when the context has none, like the real runner.
		txRunner.run.mockImplementation(
			async (ctx, fn) => await fn(ctx.trx ? ctx : { trx: mock<Transaction>() }),
		);
	});

	it('runs the effect after the outermost transaction returns', async () => {
		await runInTransaction(txRunner, {}, async (ctx) => {
			await runInTransaction(txRunner, ctx, async (inner) => afterCommit(inner, effect));
			expect(effect).not.toHaveBeenCalled();
		});

		expect(effect).toHaveBeenCalledOnce();
	});

	it('drops the effect when the transaction fails', async () => {
		const failed = runInTransaction(txRunner, {}, async (ctx) => {
			afterCommit(ctx, effect);
			throw new Error('Rolled back');
		});

		await expect(failed).rejects.toThrow('Rolled back');
		expect(effect).not.toHaveBeenCalled();
	});

	it('runs the effect now when no transaction collects it', () => {
		const ctx: OperationContext = { trx: mock<Transaction>() };
		afterCommit(ctx, effect);
		expect(effect).toHaveBeenCalledOnce();
	});
});
