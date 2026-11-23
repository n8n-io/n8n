import { MigrationExecutor, type DataSource } from '@n8n/typeorm';

// Outside the range of `@n8n/db`'s `DbLock` ids, in case the engine shares a database with n8n.
const MIGRATIONS_LOCK_ID = 2001;

/**
 * Runs the pending engine migrations in one process at a time. A
 * transaction-scoped advisory lock makes the other processes wait, and then
 * they find nothing pending. Postgres releases the lock when the transaction
 * ends or its connection closes. The migrations run on the lock's connection,
 * so a pool of one connection works, and they commit or roll back as one unit.
 */
export async function runMigrations(dataSource: DataSource): Promise<void> {
	// After the wait, a process must see the migrations that the lock holder committed.
	await dataSource.transaction('READ COMMITTED', async (tx) => {
		// No server timeout may end the wait for the lock or the transaction that holds it.
		await tx.query(
			'SET LOCAL statement_timeout = 0; SET LOCAL lock_timeout = 0; SET LOCAL idle_in_transaction_session_timeout = 0',
		);
		await tx.query('SELECT pg_advisory_xact_lock($1)', [MIGRATIONS_LOCK_ID]);
		const executor = new MigrationExecutor(dataSource, tx.queryRunner);
		// 'none': the executor opens no transaction of its own and runs inside the lock's.
		executor.transaction = 'none';
		await executor.executePendingMigrations();
	});
}
