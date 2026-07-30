import { Repository } from '@n8n/typeorm';
import type { EntityManager, ObjectLiteral } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import type { OperationContext } from '../services/transaction';
import { TypeOrmTransaction } from '../services/typeorm-transaction';

/**
 * Base class for repositories that participate in {@link TransactionRunner} transactions.
 *
 * It owns the single seam that turns an opaque {@link Transaction} back into a native
 * `EntityManager`: {@link BaseRepository.managerFor}. That method is `protected`, so the
 * unwrap is reachable only from repository subclasses — business logic can hold a
 * `Transaction` but never resolve it to a driver handle.
 */
export abstract class BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
	/**
	 * The manager a query should run against: the context's active transaction if present,
	 * otherwise this repository's default manager. `ctx` is always required — thread the one
	 * received from `TransactionRunner.run`; a non-transactional caller passes the root `{}`.
	 */
	protected managerFor(ctx: OperationContext): EntityManager {
		return entityManagerFor(ctx, this.manager);
	}
}

/**
 * The manager a query should run against, for persistence code written before
 * {@link BaseRepository} existed and not extending it. New code should extend
 * `BaseRepository` and use the protected {@link BaseRepository.managerFor} instead.
 * Business logic threads an `OperationContext` and never calls this.
 */
export function entityManagerFor(ctx: OperationContext, fallback: EntityManager): EntityManager {
	const { trx } = ctx;
	if (!trx) return fallback;

	if (!(trx instanceof TypeOrmTransaction)) {
		throw new UnexpectedError('Transaction was not created by the TypeORM runner');
	}

	return trx.getEntityManager();
}
