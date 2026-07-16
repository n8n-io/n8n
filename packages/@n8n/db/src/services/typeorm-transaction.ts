import { Service } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';

import type { OperationContext, RunOptions } from './transaction';
import { Transaction, TransactionRunner } from './transaction';

/**
 * TypeORM implementation of the {@link Transaction} port. Wraps the active
 * `EntityManager` in a hard-private field; the only way to read it back is
 * {@link TypeOrmTransaction.getEntityManager}, which only the repository layer calls.
 */
export class TypeOrmTransaction implements Transaction {
	readonly #manager: EntityManager;

	constructor(manager: EntityManager) {
		this.#manager = manager;
	}

	getEntityManager(): EntityManager {
		return this.#manager;
	}
}

/** TypeORM implementation of the {@link TransactionRunner} port. */
@Service()
export class TypeOrmTransactionRunner extends TransactionRunner {
	constructor(private readonly dataSource: DataSource) {
		super();
	}

	async run<T>(
		context: OperationContext,
		fn: (ctx: OperationContext) => Promise<T>,
		options?: RunOptions,
	): Promise<T> {
		// Reuse the active transaction if the context already carries one, so nested `run`
		// calls join the outer transaction instead of opening a second one.
		if (context.trx) return await fn(context);

		const runInTransaction = async (manager: EntityManager) =>
			await fn({ ...context, trx: new TypeOrmTransaction(manager) });

		return options?.isolationLevel
			? await this.dataSource.transaction(options.isolationLevel, runInTransaction)
			: await this.dataSource.transaction(runInTransaction);
	}
}
