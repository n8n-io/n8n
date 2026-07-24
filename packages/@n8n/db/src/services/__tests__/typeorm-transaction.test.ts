import type { Logger } from '@n8n/backend-common';
import type { DataSource, EntityManager, ObjectLiteral } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BaseRepository } from '../../repositories/base-repository';
import type { OperationContext, Transaction } from '../transaction';
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
});

describe('BaseRepository.managerFor', () => {
	class TestRepository extends BaseRepository<ObjectLiteral> {
		resolve(ctx: OperationContext): EntityManager {
			return this.managerFor(ctx);
		}
	}

	const defaultManager = mock<EntityManager>();
	const repository = new TestRepository(class Dummy {}, defaultManager);

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
