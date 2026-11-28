import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'runtime_credential_rule';

export class AddAllowedDomainsToRuntimeCredentialRule1795700000003 implements ReversibleMigration {
	// No table has a foreign key to `runtime_credential_rule`, so the SQLite table
	// recreation cannot cascade into other tables.
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			tableName,
			[
				column('allowedDomains').text.comment(
					'Comma separated hosts that the secret can be sent to. Null means no restriction',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(tableName, ['allowedDomains'], { recreatesOnSqlite: true });
	}
}
