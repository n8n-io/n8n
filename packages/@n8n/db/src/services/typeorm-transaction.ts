import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';

import type { IsolationLevel, OperationContext, RunOptions } from './transaction';
import { Transaction, TransactionRunner } from './transaction';

/**
 * TypeORM implementation of the {@link Transaction} port. Wraps the active
 * `EntityManager` in a hard-private field; the only way to read it back is
 * {@link TypeOrmTransaction.getEntityManager}, which only the repository layer calls.
 */
export class TypeOrmTransaction extends Transaction {
	readonly #manager: EntityManager;

	constructor(manager: EntityManager, isolationLevel?: IsolationLevel) {
		super(isolationLevel);
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
		const runInTransaction = async (manager: EntityManager) =>
			await fn({ ...context, trx: new TypeOrmTransaction(manager, isolationLevel) });

		return isolationLevel
			? await this.dataSource.transaction(isolationLevel, runInTransaction)
			: await this.dataSource.transaction(runInTransaction);
	}
}
