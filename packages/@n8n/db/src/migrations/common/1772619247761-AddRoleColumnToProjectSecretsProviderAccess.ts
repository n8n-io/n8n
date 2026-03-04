import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'project_secrets_provider_access';

export class AddRoleColumnToProjectSecretsProviderAccess1772619247761
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table, [
			column('role').varchar(128).notNull.default("'secretsProviderConnection:user'"),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['role']);
	}
}
