import type { MigrationContext, ReversibleMigration } from '../migration-types';

const credentialsTableName = 'credentials_entity';

export class AddTypeVersionToCredentials1784000000021 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(credentialsTableName, [column('typeVersion').double]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(credentialsTableName, ['typeVersion']);
	}
}
