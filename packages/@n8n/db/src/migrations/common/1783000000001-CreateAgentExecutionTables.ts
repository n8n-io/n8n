import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Agent runs no longer share `execution_entity` with workflow executions.
 * They live in two dedicated tables:
 *   - `agent_execution_threads` — per-session aggregate (token usage,
 *     session number, title, emoji). Renamed from `execution_threads`.
 *   - `agent_execution`         — per-message run record with typed
 *     columns. Replaces the agent rows that previously lived in
 *     `execution_entity` + free-form key/value rows in
 *     `execution_metadata`.
 *
 * This migration also undoes the side-effects the previous migration
 * applied to `execution_entity`:
 *   - deletes any agent rows (`mode = 'agent'`) so the workflowId
 *     NOT NULL invariant can be restored,
 *   - drops the `threadId` column and its index,
 *   - re-applies NOT NULL on `workflowId`.
 *
 * Idempotent for fresh DBs and for DBs that ran the previous version.
 * The agents feature is unreleased and used only on dev branches, so
 * dropping the prior agent rows is acceptable — there is nothing in
 * production to preserve.
 */
export class CreateAgentExecutionTables1783000000001 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, dropTable, dropColumns, addNotNull, column },
		escape,
		runQuery,
		queryRunner,
	}: MigrationContext) {
		const tablePrefix = escape.tableName('').replace(/"/g, '');

		// ── 1. Roll back the previous migration's effects on execution_entity ──

		const executionEntity = escape.tableName('execution_entity');

		// Delete agent rows. FK CASCADE on execution_data and
		// execution_metadata clears their child rows automatically.
		await runQuery(`DELETE FROM ${executionEntity} WHERE mode = 'agent'`);

		const threadIdIndex = escape.indexName('IDX_execution_entity_threadId');
		await runQuery(`DROP INDEX IF EXISTS ${threadIdIndex}`);

		const executionTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		if (executionTable?.findColumnByName('threadId')) {
			await dropColumns('execution_entity', ['threadId']);
		}

		const refreshedExecutionTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		const workflowIdCol = refreshedExecutionTable?.findColumnByName('workflowId');
		if (workflowIdCol?.isNullable) {
			await addNotNull('execution_entity', 'workflowId');
		}

		const oldThreadsTable = await queryRunner.getTable(`${tablePrefix}execution_threads`);
		if (oldThreadsTable) {
			await dropTable('execution_threads');
		}

		// ── 2. Create the new tables ──

		await createTable('agent_execution_threads')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('agentId').varchar(36).notNull,
				column('agentName').varchar(255).notNull,
				column('projectId').varchar(255).notNull,
				column('sessionNumber').int.notNull.default(0),
				column('totalPromptTokens').int.notNull.default(0),
				column('totalCompletionTokens').int.notNull.default(0),
				column('totalCost').double.notNull.default(0),
				column('totalDuration').int.notNull.default(0),
				column('title').varchar(255),
				column('emoji').varchar(8),
			)
			.withIndexOn('agentId')
			.withIndexOn('projectId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('agent_execution')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('threadId').varchar(36).notNull,
				column('agentId').varchar(36).notNull,
				column('status').varchar(16).notNull,
				column('startedAt').timestampTimezone(3),
				column('stoppedAt').timestampTimezone(3),
				column('duration').int.notNull.default(0),
				column('userMessage').text.notNull,
				column('assistantResponse').text.notNull,
				column('model').varchar(255),
				column('promptTokens').int,
				column('completionTokens').int,
				column('totalTokens').int,
				column('cost').double,
				column('toolCalls').json,
				column('timeline').json,
				column('error').text,
				column('hitlStatus').varchar(16),
				column('workingMemory').text,
				column('source').varchar(32),
			)
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'agent_execution_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_execution');
		await dropTable('agent_execution_threads');
	}
}
