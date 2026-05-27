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
	async up(ctx: MigrationContext) {
		const { schemaBuilder } = ctx;
		const { createTable, addColumns, addForeignKey, column, dropTable, dropColumns } =
			schemaBuilder;

		await createTable('agent_history')
			.withColumns(
				column('versionId').varchar(36).primary,
				column('agentId').varchar(36).notNull,
				column('schema').json.comment('Frozen snapshot of the published AgentJsonConfig'),
				column('tools').json.comment(
					'Frozen map of `toolId → { code, descriptor }` at publish time',
				),
				column('skills').json.comment('Frozen map of `skillId → AgentSkill` at publish time'),
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

		await this.copyAgentPublishedVersionToHistory(ctx);
		await this.backfillActiveVersionId(ctx);
		await this.assertHistoryMatchesPublishedVersion(ctx);

		await dropTable('agent_published_version');

		// These columns were left from previous refactors and never actually used in the live system
		await dropColumns('agents', ['credentialId', 'provider', 'model']);
	}

	async down(ctx: MigrationContext) {
		const { schemaBuilder } = ctx;
		const { createTable, addColumns, dropForeignKey, dropColumns, dropTable, column } =
			schemaBuilder;

		await addColumns('agents', [
			column('credentialId').varchar(255),
			column('provider').varchar(128),
			column('model').varchar(128),
		]);

		await createTable('agent_published_version')
			.withColumns(
				column('agentId').varchar(36).primary,
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

		await this.restoreActiveHistoryToPublishedVersion(ctx);

		await dropForeignKey('agents', 'activeVersionId', ['agent_history', 'versionId']);
		await dropColumns('agents', ['activeVersionId']);
		await dropTable('agent_history');
	}

	/**
	 * Copy every `agent_published_version` row into `agent_history`, joining
	 * the user table to render the denormalized `author` string.
	 *
	 * Per-column COALESCE + TRIM + NULLIF so that a user with only one half of
	 * their name set (e.g. firstName='Foo', lastName=NULL) still produces
	 * 'Foo' rather than collapsing to 'Unknown'.
	 */
	private async copyAgentPublishedVersionToHistory({ escape, runQuery }: MigrationContext) {
		const agentHistoryTable = escape.tableName('agent_history');
		const agentPublishedVersionTable = escape.tableName('agent_published_version');
		const userTable = escape.tableName('user');
		const versionIdCol = escape.columnName('versionId');
		const agentIdCol = escape.columnName('agentId');
		const schemaCol = escape.columnName('schema');
		const toolsCol = escape.columnName('tools');
		const skillsCol = escape.columnName('skills');
		const publishedByIdCol = escape.columnName('publishedById');
		const authorCol = escape.columnName('author');
		const createdAtCol = escape.columnName('createdAt');
		const updatedAtCol = escape.columnName('updatedAt');
		const publishedFromVersionIdCol = escape.columnName('publishedFromVersionId');
		const idCol = escape.columnName('id');
		const firstNameCol = escape.columnName('firstName');
		const lastNameCol = escape.columnName('lastName');

		await runQuery(
			`INSERT INTO ${agentHistoryTable} (${versionIdCol}, ${agentIdCol}, ${schemaCol}, ${toolsCol}, ${skillsCol}, ${publishedByIdCol}, ${authorCol}, ${createdAtCol}, ${updatedAtCol})
			 SELECT apv.${publishedFromVersionIdCol}, apv.${agentIdCol}, apv.${schemaCol}, apv.${toolsCol}, apv.${skillsCol},
			        apv.${publishedByIdCol},
			        COALESCE(
			          NULLIF(
			            TRIM(COALESCE(u.${firstNameCol}, '') || ' ' || COALESCE(u.${lastNameCol}, '')),
			            ''
			          ),
			          'Unknown'
			        ),
			        apv.${createdAtCol}, apv.${updatedAtCol}
			 FROM ${agentPublishedVersionTable} apv
			 LEFT JOIN ${userTable} u ON u.${idCol} = apv.${publishedByIdCol}`,
		);
	}

	/**
	 * Point each agent's `activeVersionId` at the version it was published at
	 * (the per-agent row in `agent_published_version`). Unpublished agents
	 * stay NULL.
	 */
	private async backfillActiveVersionId({ escape, runQuery }: MigrationContext) {
		const agentsTable = escape.tableName('agents');
		const agentPublishedVersionTable = escape.tableName('agent_published_version');
		const activeVersionIdCol = escape.columnName('activeVersionId');
		const publishedFromVersionIdCol = escape.columnName('publishedFromVersionId');
		const agentIdCol = escape.columnName('agentId');
		const idCol = escape.columnName('id');

		await runQuery(
			`UPDATE ${agentsTable}
			 SET ${activeVersionIdCol} = (
			   SELECT ${publishedFromVersionIdCol}
			   FROM ${agentPublishedVersionTable} apv
			   WHERE apv.${agentIdCol} = ${agentsTable}.${idCol}
			 )`,
		);
	}

	/**
	 * Bail if the row counts don't match — that means the copy step lost rows
	 * and the subsequent `DROP TABLE agent_published_version` would silently
	 * forfeit live data.
	 */
	private async assertHistoryMatchesPublishedVersion({ escape, runQuery }: MigrationContext) {
		const agentHistoryTable = escape.tableName('agent_history');
		const agentPublishedVersionTable = escape.tableName('agent_published_version');

		const [historyCountRow] = await runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS count FROM ${agentHistoryTable}`,
		);
		const [publishedCountRow] = await runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS count FROM ${agentPublishedVersionTable}`,
		);
		if (Number(historyCountRow.count) !== Number(publishedCountRow.count)) {
			throw new Error(
				`agent_history row count (${historyCountRow.count}) does not match agent_published_version row count (${publishedCountRow.count}); aborting migration`,
			);
		}
	}

	/**
	 * Restore the per-agent `agent_published_version` row from the currently-
	 * active `agent_history` snapshot. The three dropped columns (model,
	 * provider, credentialId) come back as NULL — their original values are
	 * irretrievable but they were dead in the live system anyway.
	 */
	private async restoreActiveHistoryToPublishedVersion({ escape, runQuery }: MigrationContext) {
		const agentHistoryTable = escape.tableName('agent_history');
		const agentPublishedVersionTable = escape.tableName('agent_published_version');
		const agentsTable = escape.tableName('agents');
		const agentIdCol = escape.columnName('agentId');
		const schemaCol = escape.columnName('schema');
		const publishedFromVersionIdCol = escape.columnName('publishedFromVersionId');
		const modelCol = escape.columnName('model');
		const providerCol = escape.columnName('provider');
		const credentialIdCol = escape.columnName('credentialId');
		const publishedByIdCol = escape.columnName('publishedById');
		const toolsCol = escape.columnName('tools');
		const skillsCol = escape.columnName('skills');
		const createdAtCol = escape.columnName('createdAt');
		const updatedAtCol = escape.columnName('updatedAt');
		const versionIdCol = escape.columnName('versionId');
		const activeVersionIdCol = escape.columnName('activeVersionId');
		const idCol = escape.columnName('id');

		await runQuery(
			`INSERT INTO ${agentPublishedVersionTable}
			   (${agentIdCol}, ${schemaCol}, ${publishedFromVersionIdCol}, ${modelCol}, ${providerCol}, ${credentialIdCol}, ${publishedByIdCol}, ${toolsCol}, ${skillsCol}, ${createdAtCol}, ${updatedAtCol})
			 SELECT a.${idCol}, h.${schemaCol}, h.${versionIdCol}, NULL, NULL, NULL, h.${publishedByIdCol}, h.${toolsCol}, h.${skillsCol}, h.${createdAtCol}, h.${updatedAtCol}
			 FROM ${agentsTable} a
			 INNER JOIN ${agentHistoryTable} h ON a.${activeVersionIdCol} = h.${versionIdCol}`,
		);
	}
}
