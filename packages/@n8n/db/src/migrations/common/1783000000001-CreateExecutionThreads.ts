import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Consolidated migration for execution threads. Replaces the unreleased
 * branch migration 1780000000000-CreateExecutionThreads.
 *
 * Idempotent: existing DBs that already ran the older migration will
 * detect the existing table/columns and no-op.
 */
export class CreateExecutionThreads1783000000001 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, dropNotNull, column },
		escape,
		runQuery,
		queryRunner,
	}: MigrationContext) {
		const tablePrefix = escape.tableName('').replace(/"/g, '');

		const existingTable = await queryRunner.getTable(`${tablePrefix}execution_threads`);
		if (!existingTable) {
			await createTable('execution_threads')
				.withColumns(
					column('id').varchar(36).primary.notNull,
					column('agentId').varchar(36).notNull,
					column('agentName').varchar(255).notNull,
					column('projectId').varchar(255).notNull,
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

			// Add session/usage/title columns via ALTER TABLE (schema builder
			// doesn't emit defaults reliably across drivers for these types).
			const tableName = escape.tableName('execution_threads');
			const extraColumns: Array<{ name: string; type: string; spec: string }> = [
				{ name: 'sessionNumber', type: 'integer', spec: 'NOT NULL DEFAULT 0' },
				{ name: 'totalPromptTokens', type: 'integer', spec: 'NOT NULL DEFAULT 0' },
				{ name: 'totalCompletionTokens', type: 'integer', spec: 'NOT NULL DEFAULT 0' },
				{ name: 'totalCost', type: 'real', spec: 'NOT NULL DEFAULT 0' },
				{ name: 'totalDuration', type: 'integer', spec: 'NOT NULL DEFAULT 0' },
				{ name: 'title', type: 'varchar(255)', spec: '' },
				{ name: 'emoji', type: 'varchar(8)', spec: '' },
			];
			for (const col of extraColumns) {
				const colName = escape.columnName(col.name);
				await runQuery(
					`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${col.type} ${col.spec}`.trimEnd(),
				);
			}
		}

		const executionTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		if (executionTable && !executionTable.findColumnByName('threadId')) {
			const executionEntity = escape.tableName('execution_entity');
			const threadId = escape.columnName('threadId');
			await runQuery(`ALTER TABLE ${executionEntity} ADD COLUMN ${threadId} varchar(36)`);
		}

		const executionEntity = escape.tableName('execution_entity');
		const threadId = escape.columnName('threadId');
		const indexName = escape.indexName('IDX_execution_entity_threadId');
		await runQuery(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${executionEntity} (${threadId})`);

		// Allow agent executions which have no associated workflow.
		// Re-fetch the table so the check sees freshly added columns.
		const refreshedExecutionTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		const workflowIdCol = refreshedExecutionTable?.findColumnByName('workflowId');
		if (workflowIdCol && !workflowIdCol.isNullable) {
			await dropNotNull('execution_entity', 'workflowId');
		}
	}

	async down({
		schemaBuilder: { dropTable, dropColumns, addNotNull },
		escape,
		runQuery,
	}: MigrationContext) {
		const indexName = escape.indexName('IDX_execution_entity_threadId');
		await runQuery(`DROP INDEX IF EXISTS ${indexName}`);

		await addNotNull('execution_entity', 'workflowId');
		await dropColumns('execution_entity', ['threadId']);
		await dropTable('execution_threads');
	}
}
