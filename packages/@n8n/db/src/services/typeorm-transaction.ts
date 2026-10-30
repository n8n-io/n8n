import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import type { IsolationLevel, OperationContext, RunOptions } from './transaction';
import { Transaction, TransactionRunner } from './transaction';

/**
 * TypeORM implementation of the {@link Transaction} port. Wraps the active
 * `EntityManager` in a hard-private field; the only way to read it back is
 * {@link TypeOrmTransaction.getEntityManager}, which only the repository layer calls.
 */
export class TypeOrmTransaction extends Transaction {
	readonly #manager: EntityManager;

	constructor(manager: EntityManager, isolationLevel?: IsolationLevel, readOnly = false) {
		super(isolationLevel, readOnly);
		this.#manager = manager;
	}

	getEntityManager(): EntityManager {
		return this.#manager;
	}
}

/** TypeORM implementation of the {@link TransactionRunner} port. */
@Service()
export class TypeOrmTransactionRunner extends TransactionRunner {
	constructor(
		private readonly dataSource: DataSource,
		private readonly logger: Logger,
	) {
		super();
	}

	async run<T>(
		context: OperationContext,
		fn: (ctx: OperationContext) => Promise<T>,
		options?: RunOptions,
	): Promise<T> {
		// Reuse the active transaction if the context already carries one, so nested `run`
		// calls join the outer transaction instead of opening a second one.
		if (context.trx) {
			// A read-only `run` may join a write transaction. The reverse is a bug: the
			// write would run on a read connection and fail, or worse, be silently lost.
			if (context.trx.isReadOnly() && !options?.readOnly) {
				throw new UnexpectedError(
					'Cannot open a write transaction inside an active read-only transaction',
				);
			}
			const requested = options?.isolationLevel;
			const active = context.trx.getIsolationLevel();
			// Joining ignores the requested level, so a callee asking for a stronger level
			// silently gets the active (possibly weaker) one — warn rather than mislead.
			if (requested && requested !== active) {
				this.logger.warn(
					`Transaction requested isolation level "${requested}" but is joining an active ` +
						`transaction (${active ? `at "${active}"` : 'at the database default'}); ` +
						'the requested level is ignored.',
				);
			}
			return await fn(context);
		}

		const isolationLevel = options?.isolationLevel;

		if (options?.readOnly) {
			return await this.runReadOnly(context, fn, isolationLevel);
		}

		const runInTransaction = async (manager: EntityManager) =>
			await fn({ ...context, trx: new TypeOrmTransaction(manager, isolationLevel) });

		return isolationLevel
			? await this.dataSource.transaction(isolationLevel, runInTransaction)
			: await this.dataSource.transaction(runInTransaction);
	}

	/**
	 * `EntityManager.transaction` always creates a `'master'` query runner, so a
	 * read-only transaction drives the runner directly in `'slave'` mode. The pooled
	 * SQLite driver then leases a read-only connection. Postgres without replicas
	 * falls back to the primary connection, so the transaction is marked read-only
	 * there explicitly.
	 */
	private async runReadOnly<T>(
		context: OperationContext,
		fn: (ctx: OperationContext) => Promise<T>,
		isolationLevel?: IsolationLevel,
	): Promise<T> {
		const queryRunner = this.dataSource.createQueryRunner('slave');
		try {
			await queryRunner.connect();
			await queryRunner.startTransaction(isolationLevel);
			try {
				if (this.dataSource.options.type === 'postgres') {
					await queryRunner.query('SET TRANSACTION READ ONLY');
				}
				const trx = new TypeOrmTransaction(queryRunner.manager, isolationLevel, true);
				const result = await fn({ ...context, trx });
				await queryRunner.commitTransaction();
				return result;
			} catch (error) {
				// Mirror `EntityManager.transaction`: a failing rollback must not mask the cause.
				try {
					await queryRunner.rollbackTransaction();
				} catch {}
				throw error;
			}
		} finally {
			await queryRunner.release();
		}
	}
}
