import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddInstanceCredentials1784000000052 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres, schemaBuilder }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(16) NOT NULL DEFAULT 'workflow' CHECK (${columnName} IN ('workflow', 'instance'))`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${columnName} IS 'Where the credential may be consumed: workflow execution or an instance-level feature'`,
			);
		}

		const { createTable, column } = schemaBuilder;
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

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropTable('instance_credential_assignment');

		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
