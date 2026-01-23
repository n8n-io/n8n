import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'vector_store_data';

/**
 * Adds a vector_store_data table for persisting vector embeddings and associated data.
 * Stores vectors as bytea (binary data) to avoid pgvector extension dependency.
 * Similarity calculations are performed in JavaScript.
 */
export class AddVectorStoreDataTable1768906222000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, escape, runQuery, logger }: MigrationContext) {
		const tableName = escape.tableName(TABLE_NAME);

		// Create table with bytea column for vector storage
		await runQuery(
			`CREATE TABLE ${tableName} (
				"id" VARCHAR PRIMARY KEY,
				"memoryKey" VARCHAR(255) NOT NULL,
				"vector" BYTEA NOT NULL,
				"content" TEXT NOT NULL,
				"metadata" JSONB,
				"projectId" VARCHAR NOT NULL,
				"createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP(3),
				"updatedAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP(3),
				CONSTRAINT fk_vector_store_data_project FOREIGN KEY ("projectId") REFERENCES ${tablePrefix}project("id") ON DELETE CASCADE
			)`,
		);

		// Create composite index on memoryKey and projectId for efficient filtering
		await runQuery(
			`CREATE INDEX "${tablePrefix}vector_store_data_memory_key_project_id_idx"
			ON ${tableName} ("memoryKey", "projectId")`,
		);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		const tableName = escape.tableName(TABLE_NAME);
		await queryRunner.query(`DROP TABLE IF EXISTS ${tableName}`);
	}
}
