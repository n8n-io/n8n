import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'vector_store_data';

/**
 * Adds a vector_store_data table for persisting vector embeddings and associated data.
 * Uses BLOB storage for vector data with sqlite-vec extension for similarity search.
 */
export class AddVectorStoreDataTable1768906222000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(TABLE_NAME)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('memoryKey').varchar(255).notNull,
				column('vector').binary.notNull.comment('Vector embedding stored as binary'),
				column('content').text.notNull,
				column('metadata').json,
			)
			.withIndexOn(['memoryKey']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE_NAME);
	}
}
