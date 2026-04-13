import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateExecutionThreads1780000000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, dropNotNull, column },
		escape,
		runQuery,
		queryRunner,
	}: MigrationContext) {
		const tablePrefix = escape.tableName('').replace(/"/g, '');

		// Create execution_threads table (idempotent — createTable is a no-op if it exists)
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
		}

		// Add threadId column to execution_entity if not already present
		const executionTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		if (executionTable && !executionTable.findColumnByName('threadId')) {
			const executionEntity = escape.tableName('execution_entity');
			const threadId = escape.columnName('threadId');
			await runQuery(`ALTER TABLE ${executionEntity} ADD COLUMN ${threadId} varchar(36)`);
		}

		// Create index (IF NOT EXISTS supported by both SQLite and Postgres)
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
