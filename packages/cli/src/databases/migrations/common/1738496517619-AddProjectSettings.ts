import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddProjectSettings1738496517619 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, dropColumns, column } }: MigrationContext) {
		// TODO: copy over the icons data before dropping that column
		await addColumns('project', [column('settings').json.notNull.default({})]);
		await dropColumns('project', ['icon']);
	}

	async down({ schemaBuilder: { addColumns, dropColumns, column } }: MigrationContext) {
		await addColumns('project', [column('icon').json]);
		await dropColumns('project', ['settings']);
	}
}
