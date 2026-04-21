import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class ReplaceWorkflowCheckConfigWithWorkflowCheck1778500000000
	implements ReversibleMigration
{
	async up({ schemaBuilder: { createTable, dropTable, column } }: MigrationContext) {
		await dropTable('workflow_check_config');

		await createTable('workflow_check').withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(128).notNull,
			column('type').varchar(64).notNull,
			column('config').json.notNull,
			column('enabled').bool.notNull.default(true),
			column('severity').varchar(32).notNull,
		).withTimestamps;
	}

	async down({ schemaBuilder: { createTable, dropTable, column } }: MigrationContext) {
		await dropTable('workflow_check');

		await createTable('workflow_check_config').withColumns(
			column('checkId').varchar(255).primary.notNull,
			column('enabled').bool.notNull.default(true),
			column('severityOverride').varchar(32),
		).withTimestamps;
	}
}
