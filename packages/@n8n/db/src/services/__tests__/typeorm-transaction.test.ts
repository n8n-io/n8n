import type { Logger } from '@n8n/backend-common';
import type { DataSource, EntityManager, ObjectLiteral, QueryRunner } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BaseRepository } from '../../repositories/base-repository';
import type { OperationContext, Transaction, TransactionRunner } from '../transaction';
import { TypeOrmTransaction, TypeOrmTransactionRunner } from '../typeorm-transaction';

describe('TypeOrmTransactionRunner', () => {
	const managerFromTransaction = mock<EntityManager>();
	const dataSource = mock<DataSource>();
	const logger = mock<Logger>();

	const transactionMock =
		vi.fn<(...args: [unknown, ((m: EntityManager) => Promise<unknown>)?]) => Promise<unknown>>();

	let runner: TypeOrmTransactionRunner;

	beforeEach(() => {
		vi.resetAllMocks();
		// Mirror TypeORM's overloaded signature: transaction(cb) or transaction(level, cb).
		transactionMock.mockImplementation(async (arg1, arg2) => {
			const runInTransaction = (typeof arg1 === 'function' ? arg1 : arg2) as (
				manager: EntityManager,
			) => Promise<unknown>;
			return await runInTransaction(managerFromTransaction);
		});
		dataSource.transaction = transactionMock as never;
		runner = new TypeOrmTransactionRunner(dataSource, logger);
	});

	it('opens a new transaction and hands the callback a context carrying it', async () => {
		let received: OperationContext | undefined;

		const result = await runner.run({}, async (ctx) => {
			received = ctx;
			return 'ok';
		});

		expect(result).toBe('ok');
		expect(transactionMock).toHaveBeenCalledTimes(1);
		expect(received?.trx).toBeInstanceOf(TypeOrmTransaction);
	});

	it('reuses the active transaction when the context already carries one', async () => {
		const trx = new TypeOrmTransaction(managerFromTransaction);
		const contextWithTrx: OperationContext = { trx };
		let received: OperationContext | undefined;

		await runner.run(contextWithTrx, async (ctx) => {
			received = ctx;
		});

		// No new transaction is opened; the same context (and trx) flows through.
		expect(transactionMock).not.toHaveBeenCalled();
		expect(received).toBe(contextWithTrx);
		expect(received?.trx).toBe(trx);
	});

	it('warns when joining a transaction whose active level differs from the requested one', async () => {
		const trx = new TypeOrmTransaction(managerFromTransaction, 'READ COMMITTED');
		let ran = false;

		await runner.run(
			{ trx },
			async () => {
				ran = true;
			},
			{ isolationLevel: 'SERIALIZABLE' },
		);

		// The requested level is ignored (no new transaction), but the caller is warned.
		expect(transactionMock).not.toHaveBeenCalled();
		expect(ran).toBe(true);
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SERIALIZABLE'));
	});

	it('does not warn when joining with a matching or absent requested level', async () => {
		const trx = new TypeOrmTransaction(managerFromTransaction, 'SERIALIZABLE');

		await runner.run({ trx }, async () => undefined, { isolationLevel: 'SERIALIZABLE' });
		await runner.run({ trx }, async () => undefined);

		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('passes the isolation level through to the driver', async () => {
		await runner.run({}, async () => undefined, { isolationLevel: 'SERIALIZABLE' });

		expect(transactionMock).toHaveBeenCalledTimes(1);
		expect(transactionMock.mock.calls[0][0]).toBe('SERIALIZABLE');
	});

	it('does not mutate the caller-supplied context when augmenting', async () => {
		const rootContext: OperationContext = {};

		await runner.run(rootContext, async (ctx) => {
			expect(ctx).not.toBe(rootContext);
			expect(ctx.trx).toBeInstanceOf(TypeOrmTransaction);
		});

		expect(rootContext.trx).toBeUndefined();
	});

	it('propagates errors from the callback (rollback path)', async () => {
		await expect(
			runner.run({}, async () => {
				throw new Error('boom');
			}),
		).rejects.toThrow('boom');
	});

	describe('readOnly', () => {
		const readOnlyManager = mock<EntityManager>();
		let queryRunner: ReturnType<typeof mock<QueryRunner>>;

		beforeEach(() => {
			queryRunner = mock<QueryRunner>({ manager: readOnlyManager });
			dataSource.createQueryRunner.mockReturnValue(queryRunner);
		});

		it('drives a slave query runner and marks the transaction read-only', async () => {
			let received: OperationContext | undefined;

			const result = await runner.run(
				{},
				async (ctx) => {
					received = ctx;
					return 'ok';
				},
				{ readOnly: true },
			);

			expect(result).toBe('ok');
			expect(transactionMock).not.toHaveBeenCalled();
			expect(dataSource.createQueryRunner).toHaveBeenCalledWith('slave');
			expect(queryRunner.connect).toHaveBeenCalledTimes(1);
			expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
			expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
			expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
			expect(queryRunner.release).toHaveBeenCalledTimes(1);
			const trx = received?.trx;
			expect(trx).toBeInstanceOf(TypeOrmTransaction);
			expect(trx?.isReadOnly()).toBe(true);
			expect(trx instanceof TypeOrmTransaction && trx.getEntityManager()).toBe(queryRunner.manager);
		});

		it('rolls back and releases the runner when the callback throws', async () => {
			await expect(
				runner.run(
					{},
					async () => {
						throw new Error('boom');
					},
					{ readOnly: true },
				),
			).rejects.toThrow('boom');

			expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
			expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(queryRunner.release).toHaveBeenCalledTimes(1);
		});

		it('marks the transaction read-only on Postgres', async () => {
			Object.assign(dataSource, { options: { type: 'postgres' } });

			await runner.run({}, async () => undefined, { readOnly: true });

			expect(queryRunner.query).toHaveBeenCalledWith('SET TRANSACTION READ ONLY');
		});

		it('sends no read-only statement on the pooled SQLite driver', async () => {
			Object.assign(dataSource, { options: { type: 'sqlite-pooled' } });

			await runner.run({}, async () => undefined, { readOnly: true });

			expect(queryRunner.query).not.toHaveBeenCalled();
		});

		it('passes the isolation level to the runner', async () => {
			await runner.run({}, async () => undefined, {
				readOnly: true,
				isolationLevel: 'SERIALIZABLE',
			});

			expect(queryRunner.startTransaction).toHaveBeenCalledWith('SERIALIZABLE');
		});

		it('lets a read-only run join an active write transaction', async () => {
			const trx = new TypeOrmTransaction(managerFromTransaction);
			let received: OperationContext | undefined;

			await runner.run(
				{ trx },
				async (ctx) => {
					received = ctx;
				},
				{ readOnly: true },
			);

			expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
			expect(received?.trx).toBe(trx);
		});

		it('rejects a write run inside an active read-only transaction', async () => {
			const trx = new TypeOrmTransaction(managerFromTransaction, undefined, true);

			await expect(runner.run({ trx }, async () => undefined)).rejects.toThrow(UnexpectedError);
			expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
			expect(transactionMock).not.toHaveBeenCalled();
		});
	});
});

describe('BaseRepository.managerFor', () => {
	class TestRepository extends BaseRepository<ObjectLiteral> {
		resolve(ctx: OperationContext): EntityManager {
			return this.managerFor(ctx);
		}
	}

	const defaultManager = mock<EntityManager>();
	const repository = new TestRepository(class Dummy {}, defaultManager, mock<TransactionRunner>());

	it('returns the default manager when the context has no transaction', () => {
		expect(repository.resolve({})).toBe(defaultManager);
	});

	it("returns the transaction's manager when the context carries one", () => {
		const txManager = mock<EntityManager>();
		const ctx: OperationContext = { trx: new TypeOrmTransaction(txManager) };

		expect(repository.resolve(ctx)).toBe(txManager);
	});

	it('throws when the transaction was not created by the TypeORM runner', () => {
		const foreign: OperationContext = { trx: {} as unknown as Transaction };

		expect(() => repository.resolve(foreign)).toThrow(UnexpectedError);
	});
});
