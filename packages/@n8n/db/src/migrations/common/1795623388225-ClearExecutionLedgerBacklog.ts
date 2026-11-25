import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Deletes the ledger rows written before the workflow statistics fold step existed.
 * The previous writer counted those runs already, so a fold would count them twice.
 */
export class ClearExecutionLedgerBacklog1795623388225 implements IrreversibleMigration {
	async up({ escape, runQuery, logger, migrationName }: MigrationContext) {
		const table = escape.tableName('execution_ledger');
		const [{ backlog }] = await runQuery<Array<{ backlog: number | string }>>(
			`SELECT COUNT(*) AS backlog FROM ${table}`,
		);
		if (Number(backlog) === 0) return;

		await runQuery(`DELETE FROM ${table}`);
		logger.info(`[${migrationName}] Deleted ${backlog} execution ledger rows`);
	}
}
