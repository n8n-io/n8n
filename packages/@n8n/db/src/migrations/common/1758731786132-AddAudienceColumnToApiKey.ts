import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAudienceColumnToApiKeys1758731786132 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('user_api_keys', [
			column('audience').varchar().notNull.default("'public-api'"),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user_api_keys', ['audience']);
	}
}
