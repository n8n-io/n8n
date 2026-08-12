import type { QdrantClient, Schemas } from '@qdrant/js-client-rest';

import { BaseVectorStore } from '../storage/base-vector-store';
import type {
	FilterCondition,
	VectorFilter,
	VectorQueryResult,
	VectorRecord,
} from '../types/sdk/vector-store';
import type { JSONObject } from '../types/utils/json';

// Qdrant parses point-id UUIDs with Rust's `Uuid::parse_str`, which accepts all
// four representations below — not just hyphenated — so this must match them too:
// simple `936da01f9abd4d9d80c702af85c822a8`, hyphenated `550e8400-e29b-...-440000`,
// urn `urn:uuid:550e8400-e29b-...-440000`, and braced `{550e8400-e29b-...-440000}`.
const UUID_HYPHENATED = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_PATTERN = new RegExp(
	`^(${UUID_HYPHENATED}|[0-9a-f]{32}|urn:uuid:${UUID_HYPHENATED}|\\{${UUID_HYPHENATED}\\})$`,
	'i',
);
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
 * Metadata filtering requires a payload index on each filtered field
 * (`metadata.<key>`) — Qdrant Cloud rejects filters on unindexed fields —
 * and a field can only carry one index type at a time. Filter values are
 * also more restrictive than `PgVectorStore`: Qdrant `match` only supports
 * strings, integers, and booleans, so float values for `eq`/`ne` and
 * mixed-type arrays for `in`/`nin` (e.g. `['billing', 5]`) are rejected with
 * a descriptive error before any request is sent.
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

	close(): void {
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
	const numeric = Number(id);
	if (UNSIGNED_INT_PATTERN.test(id) && Number.isSafeInteger(numeric) && String(numeric) === id) {
		return numeric;
	}
	throw new Error(
		`Invalid Qdrant point id "${id}": Qdrant requires ids to be a UUID or a canonical unsigned integer.`,
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
		case 'ne': {
			if (typeof value === 'number' && !Number.isInteger(value)) {
				throw new Error(
					`Filter operator "${operator}" on key "${key}" does not support float values: Qdrant match only supports strings, integers, and booleans.`,
				);
			}
			const match: Schemas['Condition'] = { key: payloadKey, match: { value } };
			return operator === 'eq' ? match : { must_not: [match] };
		}
		case 'in':
		case 'nin': {
			if (!Array.isArray(value) || value.length === 0) {
				throw new Error(
					`Filter operator "${operator}" on key "${key}" requires a non-empty array value.`,
				);
			}
			const allStrings = value.every((v) => typeof v === 'string');
			const allIntegers = value.every((v) => typeof v === 'number' && Number.isInteger(v));
			if (!allStrings && !allIntegers) {
				throw new Error(
					`Filter operator "${operator}" on key "${key}" requires all array elements to be strings or all to be integers: Qdrant match does not support mixed-type or float values.`,
				);
			}
			// eslint-disable-next-line id-denylist -- `any` is Qdrant's match-schema field name
			const anyCondition: Schemas['Condition'] = { key: payloadKey, match: { any: value } };
			return operator === 'in' ? anyCondition : { must_not: [anyCondition] };
		}
		default:
			throw new Error(`Unsupported filter operator: "${String(operator)}"`);
	}
}
