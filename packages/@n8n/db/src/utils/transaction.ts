import type { EntityManager } from '@n8n/typeorm';

type Tx = EntityManager | null | undefined;

/**
 * Wraps a function in a transaction if no EntityManager is passed, so the same
 * function can run both in and out of a transaction without nesting one.
 *
 * @deprecated Passes an `EntityManager` (a TypeORM driver type) to the callback,
 * leaking the ORM into business logic. Inject the `TransactionRunner` port and
 * call `run(ctx, fn)` — it threads an opaque `Transaction` via the operation
 * context and unwraps the driver handle only inside `BaseRepository`. This
 * helper is removed as call sites migrate.
 */
export async function withTransaction<T>(
	manager: EntityManager,
	trx: Tx,
	run: (em: EntityManager) => Promise<T>,
): Promise<T> {
	if (trx) return await run(trx);

	return await manager.transaction(run);
}
