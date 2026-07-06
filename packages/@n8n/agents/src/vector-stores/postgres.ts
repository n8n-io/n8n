import type { Pool } from 'pg';

import { BaseVectorStore } from '../storage/base-vector-store';
import type { VectorQueryResult, VectorRecord } from '../types/sdk/vector-store';
import type { JSONObject } from '../types/utils/json';

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type PgVectorStoreOptions = {
	connectionString: string;
	tableName?: string;
};

/**
 * Postgres + pgvector backend. Requires the `pg` package (optional peer
 * dependency) and a Postgres instance with the `vector` extension available.
 *
 * @example
 * ```typescript
 * const store = new PgVectorStore('product-docs', {
 *   connectionString: 'postgresql://user:pass@localhost:5432/db',
 * });
 * ```
 */
export class PgVectorStore extends BaseVectorStore<PgVectorStoreOptions> {
	private readonly tableName: string;

	private pool?: Pool;

	constructor(name: string, options: PgVectorStoreOptions) {
		super(name, options);
		this.tableName = options.tableName ?? 'agent_knowledge';
		if (!IDENTIFIER_PATTERN.test(this.tableName)) {
			throw new Error(
				`Invalid PgVectorStore table name "${this.tableName}": must match ${IDENTIFIER_PATTERN}`,
			);
		}
	}

	async ensureReady({ dimensions }: { dimensions: number }): Promise<void> {
		const pool = await this.getPool();
		await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
		await this.assertDimensionsMatch(pool, dimensions);
		await pool.query(
			`CREATE TABLE IF NOT EXISTS "${this.tableName}" (
				id TEXT PRIMARY KEY,
				content TEXT NOT NULL,
				metadata JSONB NOT NULL DEFAULT '{}',
				embedding vector(${dimensions}) NOT NULL
			);`,
		);
		await pool.query(
			`CREATE INDEX IF NOT EXISTS "${this.tableName}_embedding_idx" ON "${this.tableName}" USING hnsw (embedding vector_cosine_ops);`,
		);
	}

	async upsert(records: VectorRecord[]): Promise<void> {
		if (records.length === 0) return;

		const pool = await this.getPool();
		const values: string[] = [];
		const params: unknown[] = [];
		records.forEach((record, index) => {
			const base = index * 4;
			values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector)`);
			params.push(
				record.id,
				record.content,
				JSON.stringify(record.metadata),
				serializeVector(record.vector),
			);
		});

		await pool.query(
			`INSERT INTO "${this.tableName}" (id, content, metadata, embedding)
			 VALUES ${values.join(', ')}
			 ON CONFLICT (id) DO UPDATE
			 SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, embedding = EXCLUDED.embedding;`,
			params,
		);
	}

	async query(vector: number[], opts: { topK: number }): Promise<VectorQueryResult[]> {
		const pool = await this.getPool();
		const result = await pool.query<{
			id: string;
			content: string;
			metadata: JSONObject;
			score: number;
		}>(
			`SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS score
			 FROM "${this.tableName}"
			 ORDER BY embedding <=> $1::vector
			 LIMIT $2;`,
			[serializeVector(vector), opts.topK],
		);

		return result.rows.map((row) => ({
			id: row.id,
			content: row.content,
			metadata: row.metadata,
			score: Number(row.score),
		}));
	}

	async delete({ ids }: { ids: string[] }): Promise<void> {
		if (ids.length === 0) return;

		const pool = await this.getPool();
		await pool.query(`DELETE FROM "${this.tableName}" WHERE id = ANY($1);`, [ids]);
	}

	async close(): Promise<void> {
		await this.pool?.end();
		this.pool = undefined;
	}

	/** Guard against a pre-existing table with a different embedding dimension, which would
	 *  otherwise fail later with a confusing pgvector error on insert/query. */
	private async assertDimensionsMatch(pool: Pool, dimensions: number): Promise<void> {
		const result = await pool.query<{ atttypmod: number }>(
			`SELECT atttypmod FROM pg_attribute
			 WHERE attrelid = to_regclass(quote_ident($1)) AND attname = 'embedding' AND NOT attisdropped;`,
			[this.tableName],
		);
		const existingDimensions = result.rows[0]?.atttypmod;
		if (existingDimensions !== undefined && existingDimensions !== dimensions) {
			throw new Error(
				`PgVectorStore table "${this.tableName}" already stores ${existingDimensions}-dimensional ` +
					`embeddings, but the configured embedding model produces ${dimensions} dimensions. ` +
					'Use a different tableName or a matching embedding model.',
			);
		}
	}

	private async getPool(): Promise<Pool> {
		if (!this.pool) {
			const { Pool: PoolCtor } = await import('pg');
			this.pool = new PoolCtor({ connectionString: this.constructorOptions.connectionString });
		}
		return this.pool;
	}
}

function serializeVector(vector: number[]): string {
	return `[${vector.join(',')}]`;
}
