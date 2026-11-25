import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Deletes the ledger rows written before the workflow statistics fold step existed.
 * The previous writer counted those runs already, so a fold would count them twice.
 */
export class ClearExecutionLedgerBacklog1795623388225 implements IrreversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName('execution_ledger');
		// A large backlog makes a Postgres DELETE slow. SQLite has no TRUNCATE.
		await runQuery(isPostgres ? `TRUNCATE TABLE ${table}` : `DELETE FROM ${table}`);
	}
}
