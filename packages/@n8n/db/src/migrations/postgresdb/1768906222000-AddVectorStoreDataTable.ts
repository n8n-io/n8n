import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'vector_store_data';

/**
 * Adds a vector_store_data table for persisting vector embeddings and associated data.
 * Attempts to use pgvector extension if available, otherwise falls back to bytea storage.
 */
export class AddVectorStoreDataTable1768906222000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName(TABLE_NAME);

		// Try to enable pgvector extension if available
		let hasVectorSupport = false;
		try {
			// Check if pgvector is available as an extension
			const result = await queryRunner.query(
				`SELECT * FROM pg_available_extensions WHERE name = 'vector'`,
			);

			if (result.length > 0) {
				// Try to create the extension (requires appropriate permissions)
				await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
				hasVectorSupport = true;
			}
		} catch (error) {
			// pgvector not available or insufficient permissions - will use bytea fallback
			hasVectorSupport = false;
		}

		if (hasVectorSupport) {
			// Create table with native vector column type
			await runQuery(
				`CREATE TABLE ${tableName} (
					"id" VARCHAR PRIMARY KEY,
					"memoryKey" VARCHAR(255) NOT NULL,
					"vector" vector(1536) NOT NULL,
					"content" TEXT NOT NULL,
					"metadata" JSONB,
					"createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP(3),
					"updatedAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP(3)
				)`,
			);

			// Create vector similarity index for efficient nearest neighbor search
			await runQuery(
				`CREATE INDEX "${tablePrefix}vector_store_data_vector_idx"
				ON ${tableName}
				USING ivfflat ("vector" vector_cosine_ops)
				WITH (lists = 100)`,
			);
		} else {
			// Fallback: use bytea for vector storage
			await runQuery(
				`CREATE TABLE ${tableName} (
					"id" VARCHAR PRIMARY KEY,
					"memoryKey" VARCHAR(255) NOT NULL,
					"vector" BYTEA NOT NULL,
					"content" TEXT NOT NULL,
					"metadata" JSONB,
					"createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP(3),
					"updatedAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP(3)
				)`,
			);
		}

		// Create index on memoryKey for efficient filtering
		await runQuery(
			`CREATE INDEX "${tablePrefix}vector_store_data_memory_key_idx"
			ON ${tableName} ("memoryKey")`,
		);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		const tableName = escape.tableName(TABLE_NAME);
		await queryRunner.query(`DROP TABLE IF EXISTS ${tableName}`);
	}
}
