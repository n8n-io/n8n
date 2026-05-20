import type { MigrationContext, ReversibleMigration } from '../migration-types';

const credentialsTableName = 'credentials_entity';

export class AddMetadataToCredentials1779304131925 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// todo: Verify with n8n team whether .json works for sqlite as that's technically not a support data type.
		await addColumns(credentialsTableName, [column('metadata').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(credentialsTableName, ['metadata']);
	}
}
