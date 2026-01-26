import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'binary_data';

export class CreateBinaryDataTable1763716655000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('fileId').uuid.primary.notNull,
				column('sourceType')
					.varchar(50)
					.notNull.comment("Source the file belongs to, e.g. 'execution'"),
				column('sourceId').varchar(255).notNull.comment('ID of the source, e.g. execution ID'),
				column('data').binary.notNull.comment('Raw, not base64 encoded'),
				column('mimeType').varchar(255),
				column('fileName').varchar(255),
				column('fileSize').int.notNull.comment('In bytes'),
			)
			.withEnumCheck('sourceType', ['execution', 'chat_message_attachment'])
			.withIndexOn(['sourceType', 'sourceId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
