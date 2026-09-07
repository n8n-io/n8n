import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddDataTableMetadata1788774097553 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'data_table',
			[
				column('metadata')
					.json.notNull.default("'{}'")
					.comment('Extensible Data Table configuration'),
			],
			{ recreatesOnSqlite: true },
		);
		await addColumns(
			'data_table_column',
			[column('options').json.comment('Allowed values for an enum column')],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('data_table_column', ['options'], { recreatesOnSqlite: true });
		await dropColumns('data_table', ['metadata'], { recreatesOnSqlite: true });
	}
}
