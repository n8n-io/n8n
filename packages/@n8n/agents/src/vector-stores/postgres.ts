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
	tableName: string;
	/** Passed through to `pg.Pool` so an unreachable host fails fast instead of hanging. */
	connectionTimeoutMillis?: number;
};

/**
 * Postgres + pgvector backend (`pg` is an optional peer dependency).
 * Never creates or alters schema: expects an existing table with the
 * standard pgvector layout — id (unique), content text, metadata jsonb,
 * embedding vector(n). The embedding model must match the one that produced
 * the stored vectors.
 *
 * @example
 * ```typescript
 * const store = new PgVectorStore('product-docs', {
 *   connectionString: 'postgresql://user:pass@localhost:5432/db',
 *   tableName: 'product_docs',
 * });
 * ```
 */
export class PgVectorStore extends BaseVectorStore<PgVectorStoreOptions> {
	private readonly tableName: string;

	private pool?: Pool;

	private iterativeScanSupportedPromise?: Promise<boolean>;

	constructor(name: string, options: PgVectorStoreOptions) {
		super(name, options);
		this.tableName = options.tableName;
		if (typeof this.tableName !== 'string' || !IDENTIFIER_PATTERN.test(this.tableName)) {
			throw new Error(
				`Invalid PgVectorStore table name "${String(this.tableName)}": must match ${IDENTIFIER_PATTERN}`,
			);
		}
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
		const selectSql = `SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS score
			 FROM "${this.tableName}"`;

		if (!opts.filter || opts.filter.conditions.length === 0) {
			const result = await pool.query<PgVectorRow>(
				`${selectSql}
				 ORDER BY embedding <=> $1::vector
				 LIMIT $2;`,
				[serializeVector(vector), opts.topK],
			);
			return result.rows.map(toQueryResult);
		}

		const { whereSql, params } = this.buildFilterClause(opts.filter, 2);
		const sql = `${selectSql}
			 WHERE ${whereSql}
			 ORDER BY embedding <=> $1::vector
			 LIMIT $2;`;
		const allParams = [serializeVector(vector), opts.topK, ...params];

		if (!(await this.supportsIterativeScan())) {
			const result = await pool.query<PgVectorRow>(sql, allParams);
			return result.rows.map(toQueryResult);
		}

		// Filtered HNSW scans can under-return: the index gathers candidates by
		// distance alone before the filter applies, so a selective filter can
		// leave fewer than `topK` rows even when matches exist elsewhere in the
		// graph. Iterative scan keeps walking until LIMIT is met; `relaxed_order`
		// trades strict distance ordering for that guarantee, hence the re-sort.
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

	/** Keys and values are always bind parameters; only the regex-validated table name is interpolated. */
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
				// Containment per candidate (rather than `metadata->>key = ANY(text[])`) keeps
				// numeric and string metadata distinct — text extraction would otherwise make
				// the number 5 and the string "5" match the same filter value.
				const anyMatch = value
					.map(
						(candidate) => `metadata @> ${nextParam(JSON.stringify({ [key]: candidate }))}::jsonb`,
					)
					.join(' OR ');
				return operator === 'in' ? `(${anyMatch})` : `NOT (${anyMatch})`;
			}
			default:
				throw new Error(`Unsupported filter operator: "${String(operator)}"`);
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
			this.pool = new PoolCtor({
				connectionString: this.constructorOptions.connectionString,
				...(this.constructorOptions.connectionTimeoutMillis
					? { connectionTimeoutMillis: this.constructorOptions.connectionTimeoutMillis }
					: {}),
			});
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
