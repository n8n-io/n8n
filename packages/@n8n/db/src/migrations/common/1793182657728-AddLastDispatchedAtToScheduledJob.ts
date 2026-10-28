import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'scheduled_job';
const column = 'lastDispatchedAt';

/**
 * Adds the dispatch time of the newest occurrence to `scheduled_job`.
 * Nullable with no default, so existing rows need no backfill.
 *
 * Raw `ADD COLUMN` and `DROP COLUMN` rather than the schema builder, so SQLite
 * does not rebuild `scheduled_job`, which `scheduled_task` references with
 * ON DELETE CASCADE.
 */
export class AddLastDispatchedAtToScheduledJob1793182657728 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const tableName = escape.tableName(table);
		const columnName = escape.columnName(column);
		const type = isPostgres ? 'timestamptz(3)' : 'datetime(3)';

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type}`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${columnName} IS ` +
					"'When the newest occurrence of this job reported its effect. Survives the retention of the occurrence rows.'",
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName(table)} DROP COLUMN ${escape.columnName(column)}`,
		);
	}
}
