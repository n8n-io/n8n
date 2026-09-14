import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PAGE_TABLE = 'page';

export class AddTitleToPage1789042652437 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			PAGE_TABLE,
			[
				column('title')
					.varchar(255)
					.comment('Shown in the menu and the browser tab; null falls back to the route'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(PAGE_TABLE, ['title'], { recreatesOnSqlite: true });
	}
}
