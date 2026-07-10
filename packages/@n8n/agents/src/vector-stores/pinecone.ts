import type { Index, RecordMetadata, ScoredPineconeRecord } from '@pinecone-database/pinecone';

import { BaseVectorStore } from '../storage/base-vector-store';
import type {
	FilterCondition,
	VectorFilter,
	VectorQueryResult,
	VectorRecord,
} from '../types/sdk/vector-store';
import type { JSONObject, JSONValue } from '../types/utils/json';

/** Metadata key reserved for document content — Pinecone has no separate content column. */
const CONTENT_KEY = '_content';

/** Pinecone caps upserts at 1,000 records / 2MB per request and the client does not auto-batch. */
const UPSERT_MAX_RECORDS = 1000;
const UPSERT_MAX_BYTES = 1_800_000; // headroom below the hard 2MB cap for JSON encoding overhead

/** Pinecone caps deletes at 1,000 record IDs per request. */
const DELETE_MAX_IDS = 1000;

export type PineconeVectorStoreOptions = {
	apiKey: string;
	indexName: string;
	/** Pinecone namespace. Default: the index's default namespace (`''`). */
	namespace?: string;
};

/**
 * Pinecone backend (`@pinecone-database/pinecone` is an optional peer dependency).
 * Never creates or alters the index: expects one that already exists with vector
 * dimension matching the embedding model and Cosine metric.
 *
 * Pinecone metadata is flat only (string, number, boolean, or string-array
 * values — no nested objects, no null), so document content is stored under
 * a reserved `_content` metadata key alongside the caller's metadata spread
 * at the top level. Metadata containing that reserved key, or a value of an
 * unsupported shape, is rejected before any request is sent. Because content
 * is stored as metadata, Pinecone's 40KB per-record metadata limit applies
 * to the document content plus its metadata combined.
 *
 * Pinecone's `$ne`/`$nin` filter operators do not match records missing the
 * filtered key, unlike `PgVectorStore`/`QdrantVectorStore`/`SupabaseVectorStore`
 * — `ne`/`nin` are translated into an `$or` with an `$exists: false` arm so
 * behavior matches the other backends.
 *
 * Pinecone writes and deletes are eventually consistent: a query issued
 * immediately after an upsert or delete may not reflect it yet.
 *
 * Pinecone only guarantees score-sorted results for unfiltered queries —
 * a filtered query's `matches` can come back out of order, so results are
 * explicitly re-sorted by score before being returned.
 *
 * @example
 * ```typescript
 * const store = new PineconeVectorStore('product-docs', {
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   indexName: 'product-docs',
 * });
 * ```
 */
export class PineconeVectorStore extends BaseVectorStore<PineconeVectorStoreOptions> {
	private index?: Index;

	async upsert(records: VectorRecord[]): Promise<void> {
		if (records.length === 0) return;

		const index = await this.getIndex();
		const mapped = records.map((record) => ({
			id: record.id,
			values: record.vector,
			metadata: toPineconeMetadata(record.content, record.metadata),
		}));
		for (const batch of batchBySize(mapped, UPSERT_MAX_RECORDS, UPSERT_MAX_BYTES)) {
			await index.upsert(batch);
		}
	}

	async query(
		vector: number[],
		opts: { topK: number; filter?: VectorFilter },
	): Promise<VectorQueryResult[]> {
		const index = await this.getIndex();
		const filter =
			opts.filter && opts.filter.conditions.length > 0
				? buildPineconeFilter(opts.filter)
				: undefined;

		const result = await index.query({
			vector,
			topK: opts.topK,
			includeMetadata: true,
			...(filter ? { filter } : {}),
		});

		// Pinecone does not guarantee score-sorted results for filtered queries
		// (only for unfiltered ones) — sort explicitly to match the other backends.
		const sorted = [...result.matches].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
		return sorted.map(toQueryResult);
	}

	async delete({ ids }: { ids: string[] }): Promise<void> {
		if (ids.length === 0) return;

		const index = await this.getIndex();
		for (let i = 0; i < ids.length; i += DELETE_MAX_IDS) {
			await index.deleteMany(ids.slice(i, i + DELETE_MAX_IDS));
		}
	}

	close(): void {
		this.index = undefined;
	}

	private async getIndex(): Promise<Index> {
		if (!this.index) {
			const { Pinecone } = await import('@pinecone-database/pinecone');
			const pc = new Pinecone({ apiKey: this.constructorOptions.apiKey });
			const target = pc.index(this.constructorOptions.indexName);
			this.index = this.constructorOptions.namespace
				? target.namespace(this.constructorOptions.namespace)
				: target;
		}
		return this.index;
	}
}

/** Splits items into request-sized batches, respecting both a record-count and a serialized-byte-size limit. */
function batchBySize<T>(items: T[], maxCount: number, maxBytes: number): T[][] {
	const batches: T[][] = [];
	let batch: T[] = [];
	let batchBytes = 0;

	for (const item of items) {
		const itemBytes = Buffer.byteLength(JSON.stringify(item));
		if (batch.length > 0 && (batch.length >= maxCount || batchBytes + itemBytes > maxBytes)) {
			batches.push(batch);
			batch = [];
			batchBytes = 0;
		}
		batch.push(item);
		batchBytes += itemBytes;
	}
	if (batch.length > 0) batches.push(batch);

	return batches;
}

function toPineconeMetadata(content: string, metadata: JSONObject): RecordMetadata {
	if (CONTENT_KEY in metadata) {
		throw new Error(
			`Metadata key "${CONTENT_KEY}" is reserved for the document content and cannot be set.`,
		);
	}
	const result: RecordMetadata = { [CONTENT_KEY]: content };
	for (const [key, value] of Object.entries(metadata)) {
		assertValidMetadataValue(key, value);
		result[key] = value;
	}
	return result;
}

/** Pinecone metadata values are flat: string, number, boolean, or an array of strings — no nested objects or null. */
function assertValidMetadataValue(
	key: string,
	value: JSONValue | undefined,
): asserts value is string | number | boolean | string[] {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return;
	}
	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return;

	throw new Error(
		`Metadata value for key "${key}" is unsupported: Pinecone only supports string, number, boolean, and string-array metadata values.`,
	);
}

function toQueryResult(match: ScoredPineconeRecord): VectorQueryResult {
	const { [CONTENT_KEY]: content, ...metadata } = (match.metadata ?? {}) as JSONObject;
	return {
		id: String(match.id),
		content: typeof content === 'string' ? content : '',
		metadata,
		score: match.score ?? 0,
	};
}

/** Negations are compensated with `$exists: false` so missing-key rows match, like the other backends. */
function buildPineconeFilter(filter: VectorFilter): object {
	const terms = filter.conditions.map(buildCondition);
	return filter.combineWith === 'or' ? { $or: terms } : { $and: terms };
}

function buildCondition(condition: FilterCondition): object {
	const { key, operator, value } = condition;

	switch (operator) {
		case 'eq':
			return { [key]: { $eq: value } };
		case 'ne':
			return { $or: [{ [key]: { $ne: value } }, { [key]: { $exists: false } }] };
		case 'in':
			assertNonEmptyArray(operator, key, value);
			return { [key]: { $in: value } };
		case 'nin':
			assertNonEmptyArray(operator, key, value);
			return { $or: [{ [key]: { $nin: value } }, { [key]: { $exists: false } }] };
		default:
			throw new Error(`Unsupported filter operator: "${String(operator)}"`);
	}
}

function assertNonEmptyArray(
	operator: string,
	key: string,
	value: unknown,
): asserts value is Array<string | number> {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(
			`Filter operator "${operator}" on key "${key}" requires a non-empty array value.`,
		);
	}
}
