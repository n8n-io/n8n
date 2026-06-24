import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateEnvironmentCredentialBinding1784000000039 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('environment_credential_binding')
			.withColumns(
				column('id').int.autoGenerate.primary,
				column('workflowId').varchar(36).notNull,
				column('environmentId').varchar(36).notNull,
				column('sourceCredentialId').varchar(36).notNull,
				column('targetCredentialId').varchar(36).notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('environmentId', {
				tableName: 'project_environment',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('sourceCredentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('targetCredentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['workflowId', 'environmentId', 'sourceCredentialId'], true)
			.withIndexOn(['workflowId', 'environmentId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('environment_credential_binding');
	}
}
