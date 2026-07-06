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
 * A pluggable vector database backend. Implementations operate purely on
 * vectors — text embedding is owned by the `VectorStore` orchestrator, not
 * the backend.
 */
export interface BuiltVectorStoreBackend {
	upsert(records: VectorRecord[]): Promise<void>;
	query(vector: number[], opts: { topK: number }): Promise<VectorQueryResult[]>;
	delete(opts: { ids: string[] }): Promise<void>;
	/** Idempotent setup (e.g. create extension/table/index). Called lazily before first use. */
	ensureReady?(opts: { dimensions: number }): Promise<void>;
	/** Close the connection pool / release resources. */
	close?(): Promise<void>;
}
