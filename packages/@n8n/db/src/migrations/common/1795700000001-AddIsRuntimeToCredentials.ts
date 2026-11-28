import type { MigrationContext, ReversibleMigration } from '../migration-types';

const credentialsTableName = 'credentials_entity';

export class AddIsRuntimeToCredentials1795700000001 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			credentialsTableName,
			[
				column('isRuntime')
					.bool.notNull.default(false)
					.comment('Credential gets its secret values from the incoming request at run time'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(credentialsTableName, ['isRuntime'], { recreatesOnSqlite: true });
	}
}
