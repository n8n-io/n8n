import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateExecutionThreads1780000000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, dropNotNull, column },
		escape,
		runQuery,
		queryRunner,
	}: MigrationContext) {
		const tablePrefix = escape.tableName('').replace(/"/g, '');

		// Create execution_threads table with all columns
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
			// doesn't support default values or nullable in withColumns)
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

		// Add threadId column to execution_entity if not already present
		const executionTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		if (executionTable && !executionTable.findColumnByName('threadId')) {
			const executionEntity = escape.tableName('execution_entity');
			const threadId = escape.columnName('threadId');
			await runQuery(`ALTER TABLE ${executionEntity} ADD COLUMN ${threadId} varchar(36)`);
		}

		// Create index on threadId
		const executionEntity = escape.tableName('execution_entity');
		const threadId = escape.columnName('threadId');
		const indexName = escape.indexName('IDX_execution_entity_threadId');
		await runQuery(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${executionEntity} (${threadId})`);

		// Allow agent executions which have no associated workflow
		await dropNotNull('execution_entity', 'workflowId');
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
