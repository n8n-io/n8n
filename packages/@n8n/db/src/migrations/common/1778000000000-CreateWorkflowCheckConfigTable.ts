import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowCheckConfigTable1778000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_check_config').withColumns(
			column('checkId').varchar(255).primary.notNull,
			column('enabled').bool.notNull.default(true),
			column('severityOverride').varchar(32),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_check_config');
	}
}
