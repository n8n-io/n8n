import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateInstanceCredentialAssignmentTable1784541296678 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('instance_credential_assignment')
			.withColumns(
				column('consumerId')
					.varchar(128)
					.primary.comment('Stable server-side feature use registered with the credential broker'),
				column('credentialId').varchar(36).notNull,
			)
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'RESTRICT',
				name: 'FK_instance_credential_assignment_credential',
			})
			.withIndexOn('credentialId');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('instance_credential_assignment');
	}
}
