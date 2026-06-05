import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a non-null project foreign key to Instance AI threads. Existing threads
 * are backfilled so none is left unscoped: user threads take their owner's
 * personal project, sub-agent threads inherit their parent thread's project, and
 * any remaining thread (deleted user/parent) falls back to the instance owner's
 * personal project. A final safety net deletes any thread still unscoped after
 * the backfills — only reachable when no instance owner exists (e.g. a corrupted
 * or half-set-up database) — so the NOT NULL constraint can always be applied.
 * The schema change is reversible via `down()`.
 */
const FK_NAME = 'FK_instance_ai_threads_projectId';
const THREADS_TABLE = 'instance_ai_threads';
const PROJECT_ID_COLUMN = 'projectId';
const SUB_AGENT_PREFIX = 'instance-ai-subagent';

export class AddProjectIdToInstanceAiThread1784000000026 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column, addForeignKey, createIndex, addNotNull },
		} = ctx;

		await addColumns(
			THREADS_TABLE,
			[column(PROJECT_ID_COLUMN).varchar(36).comment('Project this thread is scoped to')],
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

	/**
	 * A user thread's `resourceId` is its owner's user id, so bind each to that
	 * user's personal project. `project:personalOwner` is the relation role used
	 * only for personal projects. `project_relation.userId` is a uuid on Postgres
	 * while `resourceId` is varchar (no implicit cast), so cast the uuid to text —
	 * not `resourceId` to uuid, since sub-agent resourceIds are not valid uuids.
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
	 * it by concatenation (works on both Postgres and SQLite) rather than parsing.
	 * Runs after the user backfill so parent projects are already populated.
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
	 * instance owner's personal project so no row is left null when the column
	 * becomes NOT NULL. We never delete rows.
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
	 * NOT NULL constraint can always be applied. This only matches rows when no
	 * instance owner exists (e.g. a half-set-up or hand-edited database); in normal
	 * operation the instance-owner backfill catches everything and this is a no-op.
	 * The alternative — letting NOT NULL fail — would brick startup, and these rows
	 * are unmappable orphans whose owning user and parent thread are already gone.
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
