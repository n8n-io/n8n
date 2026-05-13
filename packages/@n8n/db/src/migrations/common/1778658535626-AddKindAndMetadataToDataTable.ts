import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'data_table';

export class AddKindAndMetadataToDataTable1778658535626 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(TABLE_NAME, [
			column('kind')
				.varchar(16)
				.notNull.default("'list'")
				.withEnumCheck(['board', 'list'])
				.comment("Kind of data table: 'list' (default) or 'board'"),
			column('metadata')
				.json.comment(
					"Optional structured metadata, e.g. { allowedStatuses: string[] } for 'board' kind",
				)
				.default('{}'),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, ['kind', 'metadata']);
	}
}
