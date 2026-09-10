import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PAGE_TABLE = 'page';

export class AddLayoutToPage1788965411418 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			PAGE_TABLE,
			[
				column('layout').json.comment(
					'Blocks rendered around the page content, with one slot block; null inherits the nearest ancestor layout',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(PAGE_TABLE, ['layout'], { recreatesOnSqlite: true });
	}
}
