import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'data_table';

export class AddKindAndMetadataToDataTable1788770612223 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			TABLE_NAME,
			[
				column('kind')
					.varchar(16)
					.notNull.default("'list'")
					.withEnumCheck(['board', 'list'])
					.comment("Kind of data table: 'list' (default) or 'board'"),
				column('metadata')
					.json.default("'{}'")
					.comment("Structured metadata for the data table, such as a board's allowed statuses"),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, ['kind', 'metadata'], { recreatesOnSqlite: true });
	}
}
