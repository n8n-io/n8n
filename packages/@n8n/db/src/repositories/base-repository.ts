import { Repository } from '@n8n/typeorm';
import type { EntityManager, EntityTarget, ObjectLiteral } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import type { OperationContext, TransactionRunner } from '../services/transaction';
import { TypeOrmTransaction } from '../services/typeorm-transaction';

/**
 * Base class for the table behind a repository. It participates in {@link TransactionRunner}
 * transactions and owns the single seam that turns an opaque {@link Transaction} back into a
 * native `EntityManager`: {@link BaseRepository.managerFor}.
 *
 * A repository does not extend this class. It declares a file-private subclass (the table),
 * which is never exported or registered with DI, and holds it as a private field. Every data
 * access is a named use-case method on the repository that calls the table internally. If the
 * repository extended this class instead, every service that injects it would also get `find`,
 * `save`, `delete`, `createQueryBuilder` and `.manager`, and TypeORM would leak through inferred
 * types that no lint rule can see. See `trusted-source.repository.ts` in `packages/cli` for the
 * pattern.
 */
export abstract class BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
	constructor(
		target: EntityTarget<Entity>,
		manager: EntityManager,
		private readonly transactionRunner: TransactionRunner,
	) {
		super(target, manager);
	}

	/**
	 * The manager a query should run against: the context's active transaction if present,
	 * otherwise this repository's default manager. `ctx` is always required — thread the one
	 * received from `TransactionRunner.run`; a non-transactional caller passes the root `{}`.
	 *
	 * Public, because `.manager` and {@link runInTransaction} already expose the manager. The
	 * boundary is not this modifier: it is that the table is a private field of its repository
	 * and business logic never holds a `BaseRepository`.
	 */
	managerFor(ctx: OperationContext): EntityManager {
		const { trx } = ctx;
		if (!trx) return this.manager;

		if (!(trx instanceof TypeOrmTransaction)) {
			throw new UnexpectedError('Transaction was not created by the TypeORM runner');
		}

		return trx.getEntityManager();
	}

	/**
	 * Runs `fn` under `TransactionRunner.run`, so it reuses the transaction `ctx` carries
	 * instead of opening a second, independent one on another connection.
	 *
	 * `fn` receives the resolved `EntityManager`, so one multi-write body works either way,
	 * plus the augmented `ctx` — a body mid-migration can pass `ctx` to the repository
	 * methods that take one while its remaining co-writers still take the manager.
	 */
	async runInTransaction<T>(
		ctx: OperationContext,
		fn: (tx: EntityManager, ctx: OperationContext) => Promise<T>,
	): Promise<T> {
		return await this.transactionRunner.run(ctx, async (c) => await fn(this.managerFor(c), c));
	}
}
