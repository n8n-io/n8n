import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_TABLE = 'app';

export class AddComponentsToApp1789030187576 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			APP_TABLE,
			[
				column('components').text.comment(
					'TSX source of the shared components that code blocks import from app/components; null when the App has none',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(APP_TABLE, ['components'], { recreatesOnSqlite: true });
	}
}
