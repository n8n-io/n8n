import type { JSONObject } from '../utils/json';

export interface VectorDocument {
	id?: string;
	content: string;
	metadata?: JSONObject;
}

export interface VectorRecord {
	id: string;
	vector: number[];
	content: string;
	metadata: JSONObject;
}

export interface VectorQueryResult {
	id: string;
	content: string;
	metadata: JSONObject;
	score: number;
}

/**
 * Comparison applied to a single metadata key. `eq`/`ne` take a scalar;
 * `in`/`nin` take a non-empty array (enforced by `assertValidFilter`, not by
 * this type alone).
 */
export interface FilterCondition {
	key: string;
	operator: FilterOperator;
	value: FilterValue;
}

export type FilterOperator = 'eq' | 'ne' | 'in' | 'nin';

export type FilterValue = string | number | boolean | Array<string | number>;

/**
 * A flat group of conditions joined by one combinator. Deliberately not a
 * nested boolean tree — a flat list plus a single and/or covers real usage
 * while staying trivial to translate per backend.
 */
export interface VectorFilter {
	conditions: FilterCondition[];
	combineWith?: 'and' | 'or';
}

/**
 * A pluggable vector database backend. Implementations operate purely on
 * vectors — text embedding is owned by the `VectorStore` orchestrator, not
 * the backend.
 */
export interface BuiltVectorStoreBackend {
	upsert(records: VectorRecord[]): Promise<void>;
	query(
		vector: number[],
		opts: { topK: number; filter?: VectorFilter },
	): Promise<VectorQueryResult[]>;
	delete(opts: { ids: string[] }): Promise<void>;
	/** Idempotent setup (e.g. create extension/table/index). Called lazily before first use. */
	ensureReady?(opts: { dimensions: number }): Promise<void>;
	/** Close the connection pool / release resources. */
	close?(): Promise<void>;
}
