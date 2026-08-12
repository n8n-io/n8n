import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'workflow_test';

export class CreateWorkflowTestTable1786526448414 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('workflowId').varchar(36).notNull,
				column('sourceExecutionId').varchar(36).notNull,
				column('triggerNodeName').varchar(128).notNull,
				column('fixtures').json.notNull,
				column('expectations').json.notNull,
			)
			.withIndexOn('workflowId').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE);
	}
}
