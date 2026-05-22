import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Replaces the single-snapshot `agent_published_version` table with a
 * many-versions-per-agent `agent_history` table, plus an `activeVersionId`
 * pointer on `agents`. Existing publishes are copied across as the first
 * history row per agent.
 *
 * Down is lossy: only the version currently pointed to by `activeVersionId`
 * survives the revert because the old schema can hold only one row per agent.
 *
 * Also drops three dead columns from `agents` (`credentialId`, `provider`,
 * `model`) that were superseded by `agents.schema.model` and never read at
 * runtime. They're not carried over into `agent_history` either.
 */
export class CreateAgentHistoryTable1784000000011 implements ReversibleMigration {
	async up({ schemaBuilder, escape, runQuery }: MigrationContext) {
		const { createTable, addColumns, addForeignKey, column, dropTable, dropColumns } =
			schemaBuilder;

		await createTable('agent_history')
			.withColumns(
				column('versionId').varchar(36).primary.notNull,
				column('agentId').varchar(36).notNull,
				column('schema').json,
				column('tools').json,
				column('skills').json,
				column('publishedById').uuid,
				column('author').varchar(255).notNull,
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('publishedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		await addColumns('agents', [column('activeVersionId').varchar(36)]);
		await addForeignKey(
			'agents',
			'activeVersionId',
			['agent_history', 'versionId'],
			undefined,
			'SET NULL',
		);

		const agentHistoryTable = escape.tableName('agent_history');
		const agentPublishedVersionTable = escape.tableName('agent_published_version');
		const agentsTable = escape.tableName('agents');
		const userTable = escape.tableName('user');

		// Per-column COALESCE + TRIM + NULLIF so that a user with only one
		// half of their name set (e.g. firstName='Foo', lastName=NULL) still
		// produces 'Foo' rather than collapsing to 'Unknown'. Plain
		// `firstName || ' ' || lastName` would null out the whole expression
		// when either side is NULL on both SQLite and Postgres.
		await runQuery(
			`INSERT INTO ${agentHistoryTable} ("versionId", "agentId", "schema", "tools", "skills", "publishedById", "author", "createdAt", "updatedAt")
			 SELECT apv."publishedFromVersionId", apv."agentId", apv."schema", apv."tools", apv."skills",
			        apv."publishedById",
			        COALESCE(
			          NULLIF(
			            TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')),
			            ''
			          ),
			          'Unknown'
			        ),
			        apv."createdAt", apv."updatedAt"
			 FROM ${agentPublishedVersionTable} apv
			 LEFT JOIN ${userTable} u ON u."id" = apv."publishedById"`,
		);

		await runQuery(
			`UPDATE ${agentsTable}
			 SET "activeVersionId" = (
			   SELECT "publishedFromVersionId"
			   FROM ${agentPublishedVersionTable} apv
			   WHERE apv."agentId" = ${agentsTable}."id"
			 )`,
		);

		const [historyCountRow] = await runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS "count" FROM ${agentHistoryTable}`,
		);
		const [publishedCountRow] = await runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS "count" FROM ${agentPublishedVersionTable}`,
		);
		if (Number(historyCountRow.count) !== Number(publishedCountRow.count)) {
			throw new Error(
				`agent_history row count (${historyCountRow.count}) does not match agent_published_version row count (${publishedCountRow.count}); aborting migration`,
			);
		}

		await dropTable('agent_published_version');

		await dropColumns('agents', ['credentialId', 'provider', 'model']);
	}

	async down({ schemaBuilder, escape, runQuery }: MigrationContext) {
		const { createTable, addColumns, dropForeignKey, dropColumns, dropTable, column } =
			schemaBuilder;

		await addColumns('agents', [
			column('credentialId').varchar(255),
			column('provider').varchar(128),
			column('model').varchar(128),
		]);

		await createTable('agent_published_version')
			.withColumns(
				column('agentId').varchar(36).primary.notNull,
				column('schema').json,
				column('publishedFromVersionId').varchar(36).notNull,
				column('model').varchar(128),
				column('provider').varchar(128),
				column('credentialId').varchar(36),
				column('publishedById').uuid,
				column('tools').json,
				column('skills').json,
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('publishedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		const agentHistoryTable = escape.tableName('agent_history');
		const agentPublishedVersionTable = escape.tableName('agent_published_version');
		const agentsTable = escape.tableName('agents');

		await runQuery(
			`INSERT INTO ${agentPublishedVersionTable}
			   ("agentId", "schema", "publishedFromVersionId", "model", "provider", "credentialId", "publishedById", "tools", "skills", "createdAt", "updatedAt")
			 SELECT a."id", h."schema", h."versionId", NULL, NULL, NULL, h."publishedById", h."tools", h."skills", h."createdAt", h."updatedAt"
			 FROM ${agentsTable} a
			 INNER JOIN ${agentHistoryTable} h ON a."activeVersionId" = h."versionId"`,
		);

		await dropForeignKey('agents', 'activeVersionId', ['agent_history', 'versionId']);
		await dropColumns('agents', ['activeVersionId']);
		await dropTable('agent_history');
	}
}
