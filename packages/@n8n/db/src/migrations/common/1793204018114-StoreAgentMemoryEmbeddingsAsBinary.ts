import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const tableName = 'agents_memory_entries';
const columnName = 'embedding';

/**
 * Replaces the JSON embedding of episodic memory entries with float32 bytes.
 * Existing embeddings are dropped, not converted: recall skips entries without
 * an embedding, and the next capture of the same fact embeds it again.
 * Irreversible, because the dropped embeddings cannot be restored.
 *
 * Raw ALTER TABLE statements, because the schema builder recreates the table
 * on SQLite for column changes.
 */
export class StoreAgentMemoryEmbeddingsAsBinary1793204018114 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		await this.replaceColumn(context);
		await this.commentOnColumn(context);
	}

	private async replaceColumn({ escape, isPostgres, runQuery }: MigrationContext) {
		const table = escape.tableName(tableName);
		const column = escape.columnName(columnName);
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column};`);
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${isPostgres ? 'BYTEA' : 'BLOB'};`);
	}

	private async commentOnColumn({ escape, isPostgres, runQuery }: MigrationContext) {
		if (!isPostgres) return;
		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName(tableName)}.${escape.columnName(columnName)} IS 'Embedding vector for episodic recall, as float32 bytes';`,
		);
	}
}
