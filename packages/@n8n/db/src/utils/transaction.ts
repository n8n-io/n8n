import type { EntityManager } from '@n8n/typeorm';

type Tx = EntityManager | null | undefined;

// Wraps a function in a transaction if no EntityManager is passed.
// This allows to use the same function in and out of transactions
// without creating a transaction when already in one.
export async function withTransaction<T>(
	manager: EntityManager,
	trx: Tx,
	run: (em: EntityManager) => Promise<T>,
): Promise<T> {
	if (trx) return await run(trx);

	return await manager.transaction(run);
}
