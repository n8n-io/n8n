import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddSecurityKeysColumn1711390882190 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('user', [column('securityKey').json.default(null)]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user', ['securityKey']);
	}
}
