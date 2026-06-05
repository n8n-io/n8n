import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a non-null project foreign key to Instance AI threads (SQLite).
 *
 * Existing threads are backfilled so none is left unscoped: user threads take
 * their owner's personal project, sub-agent threads inherit their parent
 * thread's project, and any remaining thread (deleted user/parent) falls back to
 * the instance owner's personal project. A final safety net deletes any thread
 * still unscoped afterwards — only reachable when no instance owner exists — so
 * the NOT NULL column can always be populated.
 *
 * On SQLite each of ADD COLUMN / SET NOT NULL / ADD FOREIGN KEY recreates the
 * whole table, and `instance_ai_threads` is referenced by many tables with
 * ON DELETE CASCADE. So rather than three recreations, the column is added,
 * backfilled, and the table is then rebuilt once (create → copy → drop → rename)
 * with foreign keys disabled (`withFKsDisabled`) so the drop does not cascade
 * into the referencing tables. The Postgres variant (postgresdb/1784000000027)
 * uses the DSL directly. The schema change is reversible via `down()`.
 */
const FK_NAME = 'FK_instance_ai_threads_projectId';
const THREADS_TABLE = 'instance_ai_threads';
const THREADS_TABLE_TMP = 'instance_ai_threads_tmp';
const PROJECT_ID_COLUMN = 'projectId';
const PROJECT_ID_COMMENT = 'Project this thread is scoped to';
const SUB_AGENT_PREFIX = 'instance-ai-subagent';

export class AddProjectIdToInstanceAiThread1784000000027 implements ReversibleMigration {
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

	/**
	 * A user thread's `resourceId` is its owner's user id, so bind each to that
	 * user's personal project. `project:personalOwner` is the relation role used
	 * only for personal projects. The `CAST(... AS TEXT)` is a no-op on SQLite but
	 * keeps the backfill identical to the Postgres variant.
	 */
	private async backfillUserThreads({ runQuery, escape }: MigrationContext) {
		const threads = escape.tableName(THREADS_TABLE);
		const relation = escape.tableName('project_relation');
		const projectId = escape.columnName(PROJECT_ID_COLUMN);
		const resourceId = escape.columnName('resourceId');
		const userId = escape.columnName('userId');
		const role = escape.columnName('role');

		await runQuery(
			`UPDATE ${threads}
			 SET ${projectId} = (
				 SELECT pr.${projectId}
				 FROM ${relation} pr
				 WHERE CAST(pr.${userId} AS TEXT) = ${threads}.${resourceId}
					 AND pr.${role} = 'project:personalOwner'
				 LIMIT 1
			 )
			 WHERE ${projectId} IS NULL
				 AND ${resourceId} IN (
					 SELECT CAST(${userId} AS TEXT) FROM ${relation} WHERE ${role} = 'project:personalOwner'
				 )`,
		);
	}

	/**
	 * Sub-agent threads (`instance-ai-subagent:<parentThreadId>:<kind>`) inherit the
	 * parent thread's project. The parent id is embedded in the resourceId, so match
	 * it by concatenation rather than parsing. Runs after the user backfill so
	 * parent projects are already populated.
	 */
	private async backfillSubAgentThreads({ runQuery, escape }: MigrationContext) {
		const threads = escape.tableName(THREADS_TABLE);
		const projectId = escape.columnName(PROJECT_ID_COLUMN);
		const resourceId = escape.columnName('resourceId');
		const id = escape.columnName('id');

		await runQuery(
			`UPDATE ${threads}
			 SET ${projectId} = (
				 SELECT parent.${projectId}
				 FROM ${threads} parent
				 WHERE ${threads}.${resourceId} LIKE ('${SUB_AGENT_PREFIX}:' || parent.${id} || ':%')
					 AND parent.${projectId} IS NOT NULL
				 LIMIT 1
			 )
			 WHERE ${projectId} IS NULL
				 AND ${resourceId} LIKE '${SUB_AGENT_PREFIX}:%'`,
		);
	}

	/**
	 * Safety net for threads whose user or parent no longer exists: bind them to the
	 * instance owner's personal project so no row is left null before the rebuild.
	 * We never delete rows that can be scoped.
	 */
	private async backfillRemainingToInstanceOwner({ runQuery, escape }: MigrationContext) {
		const threads = escape.tableName(THREADS_TABLE);
		const relation = escape.tableName('project_relation');
		const user = escape.tableName('user');
		const projectId = escape.columnName(PROJECT_ID_COLUMN);
		const userId = escape.columnName('userId');
		const role = escape.columnName('role');
		const id = escape.columnName('id');
		const roleSlug = escape.columnName('roleSlug');

		await runQuery(
			`UPDATE ${threads}
			 SET ${projectId} = (
				 SELECT pr.${projectId}
				 FROM ${relation} pr
				 INNER JOIN ${user} u ON u.${id} = pr.${userId}
				 WHERE u.${roleSlug} = 'global:owner'
					 AND pr.${role} = 'project:personalOwner'
				 LIMIT 1
			 )
			 WHERE ${projectId} IS NULL`,
		);
	}

	/**
	 * Final safety net: drop any thread still unscoped after every backfill so the
	 * NOT NULL column can always be populated. This only matches rows when no
	 * instance owner exists (e.g. a half-set-up or hand-edited database); in normal
	 * operation the instance-owner backfill catches everything and this is a no-op.
	 * The alternative — a failed rebuild — would brick startup, and these rows are
	 * unmappable orphans whose owning user and parent thread are already gone.
	 */
	private async deleteUnmappableThreads({
		runQuery,
		escape,
		logger,
		migrationName,
	}: MigrationContext) {
		const threads = escape.tableName(THREADS_TABLE);
		const projectId = escape.columnName(PROJECT_ID_COLUMN);

		const [{ unmappable }] = await runQuery<Array<{ unmappable: number }>>(
			`SELECT COUNT(*) AS unmappable FROM ${threads} WHERE ${projectId} IS NULL`,
		);
		if (Number(unmappable) === 0) return;

		logger.warn(
			`[${migrationName}] Deleting ${unmappable} Instance AI thread(s) that could not be scoped to any project (no owning user, parent thread, or instance owner); their NOT NULL projectId cannot be satisfied.`,
		);
		await runQuery(`DELETE FROM ${threads} WHERE ${projectId} IS NULL`);
	}
}
