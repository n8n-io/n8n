import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'runtime_credential_rule';

export class CreateRuntimeCredentialRuleTable1795700000002 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('alias')
					.varchar(255)
					.notNull.comment('Identity of the rule. The id of its stub credential derives from it'),
				column('nodeType')
					.varchar(255)
					.notNull.comment('Trigger node type that the rule applies to, or * for every trigger'),
				column('path').text.notNull.comment(
					'Dot path into the trigger item json that holds the value',
				),
				column('credentialType')
					.varchar(255)
					.notNull.comment('Credential type that receives the value'),
				column('transform')
					.varchar(255)
					.comment('bearer or field:<name>. Null means the default, bearer'),
			)
			.withTimestamps.withUniqueConstraintOn(['alias']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
