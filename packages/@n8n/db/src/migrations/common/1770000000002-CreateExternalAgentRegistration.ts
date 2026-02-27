import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'external_agent_registration';
const credentialsTable = 'credentials_entity';

export class CreateExternalAgentRegistration1770000000002 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').varchar(500),
				column('remoteUrl').varchar(2048).notNull,
				column('remoteAgentId').varchar(128).notNull,
				column('credentialId').varchar(36),
				column('remoteCapabilities').json,
				column('skills').json,
				column('requiredCredentials').json,
				column('credentialMappings').json,
			)
			.withIndexOn('remoteAgentId')
			.withForeignKey('credentialId', {
				tableName: credentialsTable,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
