import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentCredentialDependencyTable1785828155092 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_credential_dependency')
			.withColumns(
				column('agentId').varchar(36).primary,
				column('credentialId').varchar(36).primary,
			)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['credentialId']).withCreatedAt;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_credential_dependency');
	}
}
