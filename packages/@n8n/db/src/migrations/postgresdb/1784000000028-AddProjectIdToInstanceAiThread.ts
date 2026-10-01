import {
	AddProjectIdToInstanceAiThreadBase,
	FK_NAME,
	PROJECT_ID_COLUMN,
	PROJECT_ID_COMMENT,
	THREADS_TABLE,
} from '../common/AddProjectIdToInstanceAiThreadBase';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a non-null project foreign key to Instance AI threads (Postgres).
 *
 * Postgres applies the column, NOT NULL, foreign key, and index in place via the
 * DSL (cheap ALTERs). The SQLite variant (sqlite/1784000000028) instead rebuilds
 * the table once by hand, because there each operation would recreate the whole
 * table. The shared backfill lives in {@link AddProjectIdToInstanceAiThreadBase}.
 * The schema change is reversible via `down()`.
 */
export class AddProjectIdToInstanceAiThread1784000000028
	extends AddProjectIdToInstanceAiThreadBase
	implements ReversibleMigration
{
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column, addNotNull, addForeignKey, createIndex },
		} = ctx;

		await addColumns(
			THREADS_TABLE,
			[column(PROJECT_ID_COLUMN).varchar(36).comment(PROJECT_ID_COMMENT)],
			{ recreatesOnSqlite: true },
		);

		// Scope every existing row before the column becomes NOT NULL.
		await this.backfillUserThreads(ctx);
		await this.backfillSubAgentThreads(ctx);
		await this.backfillRemainingToInstanceOwner(ctx);
		await this.deleteUnmappableThreads(ctx);

		await addNotNull(THREADS_TABLE, PROJECT_ID_COLUMN, { recreatesOnSqlite: true });
		await addForeignKey(THREADS_TABLE, PROJECT_ID_COLUMN, ['project', 'id'], FK_NAME, 'CASCADE');
		await createIndex(THREADS_TABLE, [PROJECT_ID_COLUMN]);
	}

	async down(ctx: MigrationContext) {
		const {
			schemaBuilder: { dropIndex, dropForeignKey, dropColumns },
		} = ctx;

		await dropIndex(THREADS_TABLE, [PROJECT_ID_COLUMN]);
		await dropForeignKey(THREADS_TABLE, PROJECT_ID_COLUMN, ['project', 'id'], FK_NAME);
		await dropColumns(THREADS_TABLE, [PROJECT_ID_COLUMN], { recreatesOnSqlite: true });
	}
}
