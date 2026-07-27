import type { MigrationContext } from '../migration-types';

export const FK_NAME = 'FK_instance_ai_threads_projectId';
export const THREADS_TABLE = 'instance_ai_threads';
export const PROJECT_ID_COLUMN = 'projectId';
export const PROJECT_ID_COMMENT = 'Project this thread is scoped to';
const SUB_AGENT_PREFIX = 'instance-ai-subagent';

/**
 * Shared backfill for the per-database `AddProjectIdToInstanceAiThread1784000000028`
 * migrations. The backfill SQL is identical on Postgres and SQLite, so it lives
 * here and each engine migration (postgresdb/ and sqlite/) extends this base and
 * implements only its own `up()` / `down()`.
 *
 * Existing threads are scoped so none is left unset: user threads take their
 * owner's personal project, sub-agent threads inherit their parent thread's
 * project, and any remaining thread (deleted user/parent) falls back to the
 * instance owner's personal project. A final safety net deletes any thread still
 * unscoped — only reachable when no instance owner exists (e.g. a corrupted or
 * half-set-up database) — so the NOT NULL column can always be populated.
 *
 * This is not a migration itself: it has no timestamp and is not registered in
 * any index; it is only extended by the two engine migrations.
 */
export abstract class AddProjectIdToInstanceAiThreadBase {
	/**
	 * A user thread's `resourceId` is its owner's user id, so bind each to that
	 * user's personal project. `project:personalOwner` is the relation role used
	 * only for personal projects. `project_relation.userId` is a uuid on Postgres
	 * while `resourceId` is varchar (no implicit cast), so cast the uuid to text —
	 * not `resourceId` to uuid, since sub-agent resourceIds are not valid uuids
	 * (the cast is a no-op on SQLite).
	 */
	protected async backfillUserThreads({ runQuery, escape }: MigrationContext) {
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
	protected async backfillSubAgentThreads({ runQuery, escape }: MigrationContext) {
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
	 * instance owner's personal project so no row is left null before the column
	 * becomes NOT NULL. We never delete rows that can be scoped.
	 */
	protected async backfillRemainingToInstanceOwner({ runQuery, escape }: MigrationContext) {
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
	 * The alternative — a failed migration — would brick startup, and these rows are
	 * unmappable orphans whose owning user and parent thread are already gone.
	 */
	protected async deleteUnmappableThreads({
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
