import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddProjectSettings1738496517619 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('project', [column('settings').json.notNull.default({})]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('project', ['settings']);
	}
}
