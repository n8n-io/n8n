import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddInstanceCredentials1784815940111 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres, schemaBuilder, tablePrefix }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('usageScope');
		// Named like the DSL's withEnumCheck() so a future migration can target it on Postgres
		const checkName = `"CHK_${tablePrefix}credentials_entity_usageScope"`;

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(16) NOT NULL DEFAULT 'project' CONSTRAINT ${checkName} CHECK (${columnName} IN ('project', 'instance'))`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${columnName} IS 'Where the credential may be consumed: a project-owned feature or an instance-level feature'`,
			);
		}

		const { createTable, column } = schemaBuilder;
		await createTable('instance_credential_assignment')
			.withColumns(
				column('credentialUseId')
					.varchar(128)
					.primary.comment('Stable credential use registered with the instance credential broker'),
				column('credentialId')
					.varchar(36)
					.notNull.comment(
						'Credential assigned to the registered use; repositories enforce instance usage scope',
					),
			)
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'RESTRICT',
				name: 'FK_instance_credential_assignment_credential',
			})
			.withIndexOn('credentialId').withTimestamps;
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropTable('instance_credential_assignment');

		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('usageScope');
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
