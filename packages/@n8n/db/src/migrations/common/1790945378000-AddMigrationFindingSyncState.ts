import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SYNC_TABLE = 'migration_finding_sync';
const STATUS_COLUMN = 'status';
const STARTED_AT_COLUMN = 'startedAt';
const SYNCED_AT_COLUMN = 'syncedAt';

// Inlined on purpose: a migration must not import live enums from other packages.
const SYNC_STATUSES = ['running', 'complete', 'failed'];

/**
 * Turns the sync record into the lock for the full migration-finding sync, so
 * any main can run it. `status` tells whether a run is in progress, finished,
 * or stopped early. `startedAt` dates the claim, so an abandoned run can be
 * taken over. `syncedAt` becomes nullable: a record now exists from the first
 * claim on, before any run has completed.
 *
 * Existing rows come from completed runs, so they read as `complete`. No table
 * points a foreign key at the sync table, so the SQLite recreation carries no
 * cascade risk.
 */
export class AddMigrationFindingSyncState1790945378000 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.addColumns(
			SYNC_TABLE,
			[
				schemaBuilder
					.column(STATUS_COLUMN)
					.varchar(16)
					.notNull.default("'complete'")
					.comment('MigrationFindingSyncStatus enum: "running", "complete", "failed".'),
				schemaBuilder
					.column(STARTED_AT_COLUMN)
					.timestampTimezone()
					.comment(
						'When the current or last run claimed the record. NULL for rows older than claims.',
					),
			],
			{ recreatesOnSqlite: true },
		);

		await schemaBuilder.addEnumCheck(SYNC_TABLE, STATUS_COLUMN, SYNC_STATUSES, {
			recreatesOnSqlite: true,
		});

		await schemaBuilder.dropNotNull(SYNC_TABLE, SYNCED_AT_COLUMN, { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder, escape, runQuery }: MigrationContext) {
		// A row without a completed run has no place in the old schema.
		const table = escape.tableName(SYNC_TABLE);
		const syncedAt = escape.columnName(SYNCED_AT_COLUMN);
		await runQuery(`DELETE FROM ${table} WHERE ${syncedAt} IS NULL`);

		await schemaBuilder.addNotNull(SYNC_TABLE, SYNCED_AT_COLUMN, { recreatesOnSqlite: true });

		await schemaBuilder.dropEnumCheck(SYNC_TABLE, STATUS_COLUMN, { recreatesOnSqlite: true });

		await schemaBuilder.dropColumns(SYNC_TABLE, [STATUS_COLUMN, STARTED_AT_COLUMN], {
			recreatesOnSqlite: true,
		});
	}
}
