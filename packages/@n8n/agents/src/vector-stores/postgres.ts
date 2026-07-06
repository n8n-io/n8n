import type { Pool } from 'pg';

import { BaseVectorStore } from '../storage/base-vector-store';
import type {
	FilterCondition,
	VectorFilter,
	VectorQueryResult,
	VectorRecord,
} from '../types/sdk/vector-store';
import type { JSONObject } from '../types/utils/json';

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Minimum pgvector version (inclusive) that supports `hnsw.iterative_scan`. */
const ITERATIVE_SCAN_MIN_MAJOR = 0;
const ITERATIVE_SCAN_MIN_MINOR = 8;

interface PgVectorRow {
	id: string;
	content: string;
	metadata: JSONObject;
	score: number;
}

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

	private iterativeScanSupportedPromise?: Promise<boolean>;

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
		// Accelerates the `@>` containment checks used by the eq/ne filter operators.
		await pool.query(
			`CREATE INDEX IF NOT EXISTS "${this.tableName}_metadata_idx" ON "${this.tableName}" USING gin (metadata jsonb_path_ops);`,
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

	async query(
		vector: number[],
		opts: { topK: number; filter?: VectorFilter },
	): Promise<VectorQueryResult[]> {
		const pool = await this.getPool();

		if (!opts.filter || opts.filter.conditions.length === 0) {
			const result = await pool.query<PgVectorRow>(
				`SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS score
				 FROM "${this.tableName}"
				 ORDER BY embedding <=> $1::vector
				 LIMIT $2;`,
				[serializeVector(vector), opts.topK],
			);
			return result.rows.map(toQueryResult);
		}

		const { whereSql, params } = this.buildFilterClause(opts.filter, 2);
		const sql = `SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS score
			 FROM "${this.tableName}"
			 WHERE ${whereSql}
			 ORDER BY embedding <=> $1::vector
			 LIMIT $2;`;
		const allParams = [serializeVector(vector), opts.topK, ...params];

		if (!(await this.supportsIterativeScan())) {
			const result = await pool.query<PgVectorRow>(sql, allParams);
			return result.rows.map(toQueryResult);
		}

		// A filtered HNSW query can under-return: the index gathers candidates by
		// distance alone before the WHERE clause is applied, so a selective filter
		// can leave fewer than `topK` (or zero) surviving rows even when matches
		// exist elsewhere in the graph. Iterative scan keeps walking until the
		// LIMIT is satisfied or the graph is exhausted, at the cost of returning
		// rows in slightly relaxed distance order — hence the JS re-sort below.
		// We deliberately don't force `enable_seqscan = off` here: pgvector's own
		// guidance treats planner-forcing as a debugging technique, not a
		// production default, and with the GIN metadata index in place the
		// planner can legitimately (and correctly) prefer a bitmap scan over the
		// GIN index for a selective filter — iterative_scan is simply a no-op
		// when that happens, so trusting the planner costs nothing.
		const client = await pool.connect();
		try {
			await client.query('BEGIN');
			await client.query('SET LOCAL hnsw.iterative_scan = relaxed_order;');
			const result = await client.query<PgVectorRow>(sql, allParams);
			await client.query('COMMIT');
			return result.rows.map(toQueryResult).sort((a, b) => b.score - a.score);
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
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

	/**
	 * Translate a filter group into a parameterized WHERE clause. Every key
	 * and value is bound as a query parameter — no filter-derived string is
	 * ever interpolated into the SQL text. `paramOffset` is the number of
	 * parameters already used by the caller's query (e.g. the query vector and
	 * topK), so filter parameters continue numbering from there.
	 */
	private buildFilterClause(
		filter: VectorFilter,
		paramOffset: number,
	): { whereSql: string; params: unknown[] } {
		const params: unknown[] = [];
		let paramCount = paramOffset;
		const nextParam = (value: unknown): string => {
			paramCount += 1;
			params.push(value);
			return `$${paramCount}`;
		};

		const conditionClauses = filter.conditions.map((condition) =>
			this.buildConditionClause(condition, nextParam),
		);
		const joiner = filter.combineWith === 'or' ? ' OR ' : ' AND ';

		return { whereSql: conditionClauses.join(joiner), params };
	}

	private buildConditionClause(
		condition: FilterCondition,
		nextParam: (value: unknown) => string,
	): string {
		const { key, operator, value } = condition;

		switch (operator) {
			case 'eq': {
				const v = nextParam(JSON.stringify({ [key]: value }));
				return `metadata @> ${v}::jsonb`;
			}
			case 'ne': {
				const v = nextParam(JSON.stringify({ [key]: value }));
				return `NOT (metadata @> ${v}::jsonb)`;
			}
			case 'in':
			case 'nin': {
				if (!Array.isArray(value) || value.length === 0) {
					throw new Error(
						`Filter operator "${operator}" on key "${key}" requires a non-empty array value.`,
					);
				}
				const k = nextParam(key);
				const v = nextParam(value.map(String));
				return operator === 'in'
					? `metadata->>${k} = ANY(${v})`
					: `NOT COALESCE(metadata->>${k} = ANY(${v}), false)`;
			}
			default:
				throw new Error(`Unsupported filter operator: "${String(operator)}"`);
		}
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

	private async supportsIterativeScan(): Promise<boolean> {
		if (!this.iterativeScanSupportedPromise) {
			const p = this.checkIterativeScanSupport();
			this.iterativeScanSupportedPromise = p;
			p.catch(() => {
				if (this.iterativeScanSupportedPromise === p)
					this.iterativeScanSupportedPromise = undefined;
			});
		}
		return await this.iterativeScanSupportedPromise;
	}

	private async checkIterativeScanSupport(): Promise<boolean> {
		const pool = await this.getPool();
		const result = await pool.query<{ extversion: string }>(
			"SELECT extversion FROM pg_extension WHERE extname = 'vector';",
		);
		const version = result.rows[0]?.extversion;
		if (!version) return false;
		const [major, minor] = version.split('.').map((part) => parseInt(part, 10));
		return (
			major > ITERATIVE_SCAN_MIN_MAJOR ||
			(major === ITERATIVE_SCAN_MIN_MAJOR && minor >= ITERATIVE_SCAN_MIN_MINOR)
		);
	}

	private async getPool(): Promise<Pool> {
		if (!this.pool) {
			const { Pool: PoolCtor } = await import('pg');
			this.pool = new PoolCtor({ connectionString: this.constructorOptions.connectionString });
		}
		return this.pool;
	}
}

function toQueryResult(row: PgVectorRow): VectorQueryResult {
	return {
		id: row.id,
		content: row.content,
		metadata: row.metadata,
		score: Number(row.score),
	};
}

function serializeVector(vector: number[]): string {
	return `[${vector.join(',')}]`;
}
