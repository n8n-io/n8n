import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'agents_memory_entries';
const columnName = 'embedding';

/**
 * Replaces the JSON embedding of episodic memory entries with float32 bytes.
 * Existing embeddings are dropped, not converted: recall skips entries without
 * an embedding, and the next capture of the same fact embeds it again.
 *
 * Raw ALTER TABLE statements, because the schema builder recreates the table
 * on SQLite for column changes.
 */
export class StoreAgentMemoryEmbeddingsAsBinary1793204018114 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.replaceColumn(context, context.isPostgres ? 'BYTEA' : 'BLOB');
		await this.commentOnColumn(context, 'Embedding vector for episodic recall, as float32 bytes');
	}

	async down(context: MigrationContext) {
		await this.replaceColumn(context, context.isPostgres ? 'JSON' : 'TEXT');
		await this.commentOnColumn(context, 'Embedding vector for episodic recall');
	}

	private async replaceColumn({ escape, runQuery }: MigrationContext, type: string) {
		const table = escape.tableName(tableName);
		const column = escape.columnName(columnName);
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column};`);
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
	}

	private async commentOnColumn({ escape, isPostgres, runQuery }: MigrationContext, text: string) {
		if (!isPostgres) return;
		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName(tableName)}.${escape.columnName(columnName)} IS '${text}';`,
		);
	}
}
