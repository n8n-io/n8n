import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * LOCAL-DEV-ONLY: reconciles the migrations table on machines that applied the
 * original 1780/1781/1782 migrations before they were consolidated into a single
 * AddAgentPublishVersionSupport1780000000000 migration.
 *
 * Deletes the obsolete migration records and inserts one for the consolidated
 * migration so TypeORM skips re-running it (which would fail since the tables
 * already exist).
 *
 * Delete this file (and remove it from both migration index files) after running
 * it locally. It must not ship to master.
 */
export class PatchLocalDbForConsolidatedAgentPublishMigration1782000000001
	implements IrreversibleMigration
{
	async up({ runQuery, escape }: MigrationContext) {
		const migrationsTable = escape.tableName('migrations');
		const nameColumn = escape.columnName('name');
		const timestampColumn = escape.columnName('timestamp');

		await runQuery(
			`DELETE FROM ${migrationsTable} WHERE ${nameColumn} IN (
				'CreateAgentPublishedVersionTable1780000000000',
				'AddPublishVersionTracking1781000000000',
				'MovePublishedFromVersionIdToSnapshot1782000000000'
			)`,
		);

		await runQuery(
			`INSERT INTO ${migrationsTable} (${timestampColumn}, ${nameColumn}) VALUES (1780000000000, 'AddAgentPublishVersionSupport1780000000000')`,
		);
	}
}
