import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'project_secrets_provider_access';

export class AddRoleColumnToProjectSecretsProviderAccess1772619247761
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table, [
			column('role')
				.varchar(128)
				.notNull.default("'secretsProviderConnection:user'")
				.withEnumCheck(['secretsProviderConnection:owner', 'secretsProviderConnection:user']),
		]);
	}

	async down({ schemaBuilder: { dropColumns }, tablePrefix, queryRunner }: MigrationContext) {
		const fullTableName = `${tablePrefix}${table}`;
		const checkName = `CHK_${tablePrefix}${table}_role`;
		await queryRunner.dropCheckConstraint(fullTableName, checkName);
		await dropColumns(table, ['role']);
	}
}
