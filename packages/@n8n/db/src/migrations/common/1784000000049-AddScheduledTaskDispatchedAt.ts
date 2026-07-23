import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'scheduled_task';
const columnName = 'dispatchedAt';

/**
 * Adds `dispatchedAt` to `scheduled_task`, splitting the single dispatch marker
 * into two:
 *   - `startedAt`   is now set *before* the handler runs (the pre-dispatch mutex
 *     the executor uses to run each occurrence at most once per lease),
 *   - `dispatchedAt` is set *after* the handler reports its effect handed off.
 *
 * The reaper reads `dispatchedAt`, not `startedAt`, to decide an expired lease: a
 * set value means the effect happened (complete it, never redeliver), a NULL means
 * a crash before dispatch (redeliver, so the run is not lost). Nullable, so added
 * with a raw ALTER that skips the SQLite table rebuild.
 */
export class AddScheduledTaskDispatchedAt1784000000049 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const tableName = escape.tableName(table);
		const column = escape.columnName(columnName);
		const type = isPostgres ? 'timestamptz(3)' : 'datetime(3)';
		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS ` +
					"'When the current attempt handed off its effect; NULL until then. Splits dispatch-attempted (startedAt) from effect-happened, so the reaper completes a dispatched occurrence rather than redelivering it.'",
			);
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, [columnName], { recreatesOnSqlite: true });
	}
}
