import type { QdrantClient, Schemas } from '@qdrant/js-client-rest';

import { BaseVectorStore } from '../storage/base-vector-store';
import type {
	FilterCondition,
	VectorFilter,
	VectorQueryResult,
	VectorRecord,
} from '../types/sdk/vector-store';
import type { JSONObject } from '../types/utils/json';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNSIGNED_INT_PATTERN = /^\d+$/;

interface QdrantPayload {
	content: string;
	metadata: JSONObject;
}

export type QdrantVectorStoreOptions = {
	url: string;
	apiKey?: string;
	collectionName: string;
};

/**
 * Qdrant backend (`@qdrant/js-client-rest` is an optional peer dependency).
 * Never creates or alters the collection: expects one that already exists
 * with vector size matching the embedding model and Cosine distance.
 *
 * Qdrant point ids must be a UUID or an unsigned integer — arbitrary string
 * ids (other than the UUIDs the `VectorStore` orchestrator generates) are
 * rejected with a descriptive error rather than a raw Qdrant 400.
 *
 * @example
 * ```typescript
 * const store = new QdrantVectorStore('product-docs', {
 *   url: 'http://localhost:6333',
 *   collectionName: 'product_docs',
 * });
 * ```
 */
export class QdrantVectorStore extends BaseVectorStore<QdrantVectorStoreOptions> {
	private readonly collectionName: string;

	private client?: QdrantClient;

	constructor(name: string, options: QdrantVectorStoreOptions) {
		super(name, options);
		this.collectionName = options.collectionName;
	}

	async upsert(records: VectorRecord[]): Promise<void> {
		if (records.length === 0) return;

		const client = await this.getClient();
		await client.upsert(this.collectionName, {
			wait: true,
			points: records.map((record) => ({
				id: toPointId(record.id),
				vector: record.vector,
				payload: { content: record.content, metadata: record.metadata },
			})),
		});
	}

	async query(
		vector: number[],
		opts: { topK: number; filter?: VectorFilter },
	): Promise<VectorQueryResult[]> {
		const client = await this.getClient();
		const filter =
			opts.filter && opts.filter.conditions.length > 0 ? buildQdrantFilter(opts.filter) : undefined;

		const result = await client.query(this.collectionName, {
			query: vector,
			limit: opts.topK,
			with_payload: true,
			...(filter ? { filter } : {}),
		});

		return result.points.map(toQueryResult);
	}

	async delete({ ids }: { ids: string[] }): Promise<void> {
		if (ids.length === 0) return;

		const client = await this.getClient();
		await client.delete(this.collectionName, { wait: true, points: ids.map(toPointId) });
	}

	async close(): Promise<void> {
		this.client = undefined;
	}

	private async getClient(): Promise<QdrantClient> {
		if (!this.client) {
			const { QdrantClient: QdrantClientCtor } = await import('@qdrant/js-client-rest');
			this.client = new QdrantClientCtor({
				url: this.constructorOptions.url,
				apiKey: this.constructorOptions.apiKey,
			});
		}
		return this.client;
	}
}

/** Qdrant only accepts UUID or unsigned-integer point ids. */
function toPointId(id: string): string | number {
	if (UUID_PATTERN.test(id)) return id;
	if (UNSIGNED_INT_PATTERN.test(id) && Number(id) <= Number.MAX_SAFE_INTEGER) return Number(id);
	throw new Error(
		`Invalid Qdrant point id "${id}": Qdrant requires ids to be a UUID or an unsigned integer.`,
	);
}

function toQueryResult(point: Schemas['ScoredPoint']): VectorQueryResult {
	const payload = (point.payload ?? {}) as unknown as QdrantPayload;
	return {
		id: String(point.id),
		content: payload.content,
		metadata: payload.metadata ?? {},
		score: point.score,
	};
}

/** Negations are expressed as nested `must_not` filters so both `and`/`or` combinators work uniformly. */
function buildQdrantFilter(filter: VectorFilter): Schemas['Filter'] {
	const conditions = filter.conditions.map(buildCondition);
	return filter.combineWith === 'or' ? { should: conditions } : { must: conditions };
}

function buildCondition(condition: FilterCondition): Schemas['Condition'] {
	const { key, operator, value } = condition;
	const payloadKey = `metadata.${key}`;

	switch (operator) {
		case 'eq':
			return { key: payloadKey, match: { value } };
		case 'ne':
			return { must_not: [{ key: payloadKey, match: { value } }] };
		case 'in':
		case 'nin': {
			if (!Array.isArray(value) || value.length === 0) {
				throw new Error(
					`Filter operator "${operator}" on key "${key}" requires a non-empty array value.`,
				);
			}
			const anyCondition: Schemas['Condition'] = { key: payloadKey, match: { any: value } };
			return operator === 'in' ? anyCondition : { must_not: [anyCondition] };
		}
		default:
			throw new Error(`Unsupported filter operator: "${String(operator)}"`);
	}
}
