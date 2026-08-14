import {
	AddProjectIdToInstanceAiThreadBase,
	FK_NAME,
	PROJECT_ID_COLUMN,
	PROJECT_ID_COMMENT,
	THREADS_TABLE,
} from '../common/AddProjectIdToInstanceAiThreadBase';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

const THREADS_TABLE_TMP = 'instance_ai_threads_tmp';

/**
 * Adds a non-null project foreign key to Instance AI threads (SQLite).
 *
 * On SQLite each of ADD COLUMN / SET NOT NULL / ADD FOREIGN KEY recreates the
 * whole table, and `instance_ai_threads` is referenced by many tables with
 * ON DELETE CASCADE. So rather than three recreations, the column is added,
 * backfilled (see {@link AddProjectIdToInstanceAiThreadBase}), and the table is
 * then rebuilt once (create → copy → drop → rename) with foreign keys disabled
 * (`withFKsDisabled`) so the drop does not cascade into the referencing tables.
 * The Postgres variant (postgresdb/1784000000028) uses the DSL directly. The
 * schema change is reversible via `down()`.
 */
export class AddProjectIdToInstanceAiThread1784000000028
	extends AddProjectIdToInstanceAiThreadBase
	implements ReversibleMigration
{
	withFKsDisabled = true as const;

	async up(ctx: MigrationContext) {
		// Native ADD COLUMN is metadata-only on SQLite (no recreation), so the
		// column can be backfilled before the single table rebuild materializes it
		// as NOT NULL with its foreign key.
		const { runQuery, escape } = ctx;
		await runQuery(
			`ALTER TABLE ${escape.tableName(THREADS_TABLE)} ADD COLUMN ${escape.columnName(
				PROJECT_ID_COLUMN,
			)} varchar(36)`,
		);

		await this.backfillUserThreads(ctx);
		await this.backfillSubAgentThreads(ctx);
		await this.backfillRemainingToInstanceOwner(ctx);
		await this.deleteUnmappableThreads(ctx);

		await this.rebuildTable(ctx, { withProjectId: true });
	}

	async down(ctx: MigrationContext) {
		await this.rebuildTable(ctx, { withProjectId: false });
	}

	/**
	 * Single-pass rebuild: create the target shape, copy the rows, drop the
	 * original, rename. Foreign keys are disabled for the migration, so dropping
	 * the old table does not cascade into the tables that reference it. Indexes are
	 * created on the final table after the rename so their generated names derive
	 * from `instance_ai_threads` (matching the original schema) and the dropped
	 * original frees those names — creating them on the temp table would leave a
	 * name that collides when the table is rebuilt again (e.g. down).
	 */
	private async rebuildTable(
		{
			schemaBuilder: { createTable, column, createIndex, dropTable },
			runQuery,
			escape,
			copyTable,
		}: MigrationContext,
		{ withProjectId }: { withProjectId: boolean },
	) {
		let builder = createTable(THREADS_TABLE_TMP).withColumns(
			column('id').uuid.primary.notNull,
			column('resourceId').varchar(255).notNull,
			...(withProjectId
				? [column(PROJECT_ID_COLUMN).varchar(36).notNull.comment(PROJECT_ID_COMMENT)]
				: []),
			column('title').text.default("''").notNull,
			column('metadata').json,
		);
		if (withProjectId) {
			builder = builder.withForeignKey(PROJECT_ID_COLUMN, {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: FK_NAME,
			});
		}
		await builder.withTimestamps;

		const fields = ['id', 'resourceId', ...(withProjectId ? [PROJECT_ID_COLUMN] : [])].concat(
			'title',
			'metadata',
			'createdAt',
			'updatedAt',
		);
		await copyTable(THREADS_TABLE, THREADS_TABLE_TMP, fields, fields);
		await dropTable(THREADS_TABLE);
		await runQuery(
			`ALTER TABLE ${escape.tableName(THREADS_TABLE_TMP)} RENAME TO ${escape.tableName(
				THREADS_TABLE,
			)}`,
		);

		await createIndex(THREADS_TABLE, ['resourceId']);
		if (withProjectId) {
			await createIndex(THREADS_TABLE, [PROJECT_ID_COLUMN]);
		}
	}
}
