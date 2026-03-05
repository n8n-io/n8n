import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'project_secrets_provider_access';
const roleValues = ['secretsProviderConnection:owner', 'secretsProviderConnection:user'];

export class AddRoleColumnToProjectSecretsProviderAccess1772619247761
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column }, tablePrefix, queryRunner }: MigrationContext) {
		await addColumns(table, [
			column('role').varchar(128).notNull.default("'secretsProviderConnection:user'"),
		]);

		const fullTableName = `${tablePrefix}${table}`;
		const checkName = `CHK_${tablePrefix}${table}_role`;
		const escapedColumn = queryRunner.connection.driver.escape('role');
		const escapedValues = roleValues.map((v) => `'${v}'`).join(', ');
		await queryRunner.createCheckConstraint(
			fullTableName,
			new TableCheck({ name: checkName, expression: `${escapedColumn} IN (${escapedValues})` }),
		);
	}

	async down({ schemaBuilder: { dropColumns }, tablePrefix, queryRunner }: MigrationContext) {
		const fullTableName = `${tablePrefix}${table}`;
		const checkName = `CHK_${tablePrefix}${table}_role`;
		await queryRunner.dropCheckConstraint(fullTableName, checkName);
		await dropColumns(table, ['role']);
	}
}
