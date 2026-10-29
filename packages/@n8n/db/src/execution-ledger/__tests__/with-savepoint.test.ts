import type { EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Transaction } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { FoldTransactionLostError } from '../fold-transaction-lost.error';
import { withSavepoint } from '../with-savepoint';

describe('withSavepoint', () => {
	const manager = mock<EntityManager>();
	const ctx = { trx: new TypeOrmTransaction(manager) };
	const queries = () => manager.query.mock.calls.map(([sql]) => sql);

	const failQueriesStartingWith = (prefix: string, error: Error) => {
		manager.query.mockImplementation(async (sql: string) => {
			if (sql.startsWith(prefix)) throw error;
			return [];
		});
	};

	beforeEach(() => {
		vi.resetAllMocks();
		manager.query.mockResolvedValue([]);
	});

	it('releases the savepoint and returns the result when the step succeeds', async () => {
		const fn = vi.fn(async () => 'folded');

		await expect(withSavepoint(ctx, 'insights', fn)).resolves.toBe('folded');

		expect(fn).toHaveBeenCalledWith(ctx);
		expect(queries()).toEqual([
			'SAVEPOINT fold_step_insights',
			'RELEASE SAVEPOINT fold_step_insights',
		]);
	});

	it('rolls back to the savepoint and rethrows the step error', async () => {
		const stepError = new Error('step failed');

		await expect(
			withSavepoint(ctx, 'insights', async () => {
				throw stepError;
			}),
		).rejects.toBe(stepError);

		expect(queries()).toEqual([
			'SAVEPOINT fold_step_insights',
			'ROLLBACK TO SAVEPOINT fold_step_insights',
		]);
	});

	it('throws FoldTransactionLostError when ROLLBACK TO fails', async () => {
		const stepError = new Error('disk full');
		failQueriesStartingWith('ROLLBACK TO', new Error('no such savepoint'));

		const error = await withSavepoint(ctx, 'insights', async () => {
			throw stepError;
		}).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(FoldTransactionLostError);
		expect(error).toMatchObject({
			cause: stepError,
			level: 'error',
			extra: { savepoint: 'fold_step_insights', rollbackError: 'no such savepoint' },
		});
	});

	it('rethrows a failed RELEASE when the rollback works', async () => {
		const releaseError = new Error('current transaction is aborted');
		let releases = 0;
		manager.query.mockImplementation(async (sql: string) => {
			if (sql.startsWith('RELEASE') && releases++ === 0) throw releaseError;
			return [];
		});

		await expect(withSavepoint(ctx, 'insights', async () => 'folded')).rejects.toBe(releaseError);
		expect(queries()).toContain('ROLLBACK TO SAVEPOINT fold_step_insights');
	});

	it('throws FoldTransactionLostError when RELEASE and ROLLBACK TO both fail', async () => {
		manager.query.mockImplementation(async (sql: string) => {
			if (sql.startsWith('SAVEPOINT')) return [];
			throw new Error('no transaction is active');
		});

		await expect(withSavepoint(ctx, 'insights', async () => 'folded')).rejects.toBeInstanceOf(
			FoldTransactionLostError,
		);
	});

	it('requires an active transaction', async () => {
		await expect(withSavepoint({}, 'insights', async () => 'folded')).rejects.toThrow(
			'A savepoint needs an active transaction',
		);
		expect(manager.query).not.toHaveBeenCalled();
	});

	it('rejects an invalid step name before any query', async () => {
		await expect(withSavepoint(ctx, 'a; DROP TABLE x', async () => 'folded')).rejects.toThrow(
			'Invalid fold step name',
		);
		expect(manager.query).not.toHaveBeenCalled();
	});

	it('rejects a transaction not created by the TypeORM runner', async () => {
		class ForeignTransaction extends Transaction {}

		await expect(
			withSavepoint({ trx: new ForeignTransaction() }, 'insights', async () => 'folded'),
		).rejects.toBeInstanceOf(UnexpectedError);
	});
});
