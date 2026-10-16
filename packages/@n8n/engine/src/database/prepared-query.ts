import type { EntityManager } from '@n8n/typeorm';
import type { PoolClient } from 'pg';

/** A statement Postgres parses and plans once per connection. Its text must be static. */
export type PreparedStatement = { name: string; text: string };

/**
 * Runs a prepared statement. Inside a transaction it runs on the transaction's
 * connection; otherwise it borrows a pooled connection for the one statement.
 */
export async function queryPrepared<Row>(
	manager: EntityManager,
	statement: PreparedStatement,
	values: unknown[],
): Promise<Row[]> {
	const queryRunner = manager.queryRunner ?? manager.connection.createQueryRunner();
	try {
		const client: PoolClient = await queryRunner.connect();
		const result = await client.query({ ...statement, values });
		const rows: Row[] = result.rows;
		return rows;
	} finally {
		if (queryRunner !== manager.queryRunner) await queryRunner.release();
	}
}
