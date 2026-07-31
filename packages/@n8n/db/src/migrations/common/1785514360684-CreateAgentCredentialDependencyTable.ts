import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentCredentialDependencyTable1785514360684 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_credential_dependency')
			.withColumns(
				column('agentId').varchar(36).primary,
				column('source')
					.varchar(16)
					.primary.withEnumCheck(['draft', 'published'])
					.comment('Agent configuration snapshot that references the credential'),
				column('credentialId').varchar(36).primary,
				column('sourceVersionId')
					.varchar(36)
					.comment('Published agent version; null for the current draft'),
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
