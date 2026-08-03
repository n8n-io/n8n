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

/** A comparison on one metadata key. `eq`/`ne` take a scalar, `in`/`nin` a non-empty array. */
export interface FilterCondition {
	key: string;
	operator: FilterOperator;
	value: FilterValue;
}

export type FilterOperator = 'eq' | 'ne' | 'in' | 'nin';

export type FilterValue = string | number | boolean | Array<string | number>;

/** A flat group of conditions joined by one combinator — deliberately not a nested boolean tree. */
export interface VectorFilter {
	conditions: FilterCondition[];
	combineWith?: 'and' | 'or';
}

/** A pluggable vector database backend — operates purely on vectors; embedding is the `VectorStore` orchestrator's job. */
export interface BuiltVectorStoreBackend {
	upsert(records: VectorRecord[]): Promise<void>;
	query(
		vector: number[],
		opts: { topK: number; filter?: VectorFilter },
	): Promise<VectorQueryResult[]>;
	delete(opts: { ids: string[] }): Promise<void>;
	/** Close the connection pool / release resources. */
	close?(): void | Promise<void>;
}
