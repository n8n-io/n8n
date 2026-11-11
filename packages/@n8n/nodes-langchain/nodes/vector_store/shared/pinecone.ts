import { createHash } from 'node:crypto';

import { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import {
	Pinecone as PineconeV9,
	classifyIndexShape,
	type Index as IndexV9,
	type IndexModel,
} from '@pinecone-database/pinecone-v9';
import { UserError } from 'n8n-workflow';

type ScoreBy = { type: 'dense_vector' | 'embed'; field: string };

export interface PineconeVectorStoreArgs {
	apiKey: string;
	indexName: string;
	/** Passed as is to the vectors API path. An empty value selects the default namespace */
	namespace?: string;
	filter?: object;
	/** Document indexes only: the field that holds the page content */
	textField?: string;
}

// The schema of an index can't change after creation, so a short cache only guards
// against a recreated index with the same name.
// ponytail: in-process TTL cache, one describe per index per minute on each main/worker
const DESCRIBE_TTL_MS = 60_000;
const describeCache = new Map<string, { expires: number; model: Promise<IndexModel> }>();

async function describeIndex(client: PineconeV9, apiKey: string, indexName: string) {
	// Keyed by a hash, so the cache holds no API key
	const key = createHash('sha256').update(`${apiKey}\0${indexName}`).digest('hex');
	const now = Date.now();
	const cached = describeCache.get(key);
	if (cached && cached.expires > now) return await cached.model;

	for (const [k, entry] of describeCache) if (entry.expires <= now) describeCache.delete(k);
	const model = client.describeIndex(indexName);
	describeCache.set(key, { expires: now + DESCRIBE_TTL_MS, model });
	try {
		return await model;
	} catch (error) {
		describeCache.delete(key);
		throw error;
	}
}

const INSERT_NOT_SUPPORTED =
	'Inserting into a Pinecone index with a document schema is not supported yet. Use an index without a document schema to insert documents with n8n';

/** Indexes still initializing ('indeterminate') stay on the vectors API */
function isDocumentIndex(model: IndexModel): boolean {
	if (classifyIndexShape(model) !== 'documents-api') return false;
	// A legacy integrated index has a semantic_text field and no vector fields, and the
	// Records API still serves it
	return !Object.values(model.schema?.fields ?? {}).some(
		(f) => 'type' in f && f.type === 'semantic_text',
	);
}

/**
 * Throws for an index with a document schema: the vectors API rejects its upserts.
 * Runs before any namespace is cleared.
 */
export async function assertPineconeIndexAcceptsVectors(
	apiKey: string,
	indexName: string,
): Promise<void> {
	// A failed describe keeps the vectors API path, so classic indexes fail exactly as before
	const model = await describeIndex(new PineconeV9({ apiKey }), apiKey, indexName).catch(
		() => undefined,
	);
	if (model && isDocumentIndex(model)) throw new UserError(INSERT_NOT_SUPPORTED);
}

/**
 * Returns how to score a search on an index with a document schema, or `undefined` for an
 * index that the vectors API serves (classic indexes, legacy integrated indexes, and
 * indexes that are still initializing).
 */
export function getDocumentIndexScoring(model: IndexModel): ScoreBy | undefined {
	if (!isDocumentIndex(model)) return undefined;

	const fields = Object.entries(model.schema?.fields ?? {});

	// The connected embeddings model populated a dense field, so prefer it over Pinecone-side embedding
	const dense = fields.find(([, f]) => 'type' in f && f.type === 'dense_vector');
	if (dense) return { type: 'dense_vector', field: dense[0] };
	const embed = fields.find(([, f]) => 'type' in f && f.type === 'string' && f.embed);
	if (embed) return { type: 'embed', field: embed[0] };

	throw new UserError(
		`Pinecone index "${model.name}" has no dense vector field or integrated embedding field to search`,
	);
}

export class PineconeDocumentStore extends VectorStore {
	declare FilterType: object;

	private readonly vectorFields: Set<string>;

	constructor(
		embeddings: EmbeddingsInterface,
		private readonly index: IndexV9,
		private readonly scoreBy: ScoreBy,
		model: IndexModel,
		private readonly filter?: object,
		private readonly textField?: string,
	) {
		super(embeddings, {});
		this.vectorFields = new Set(
			Object.entries(model.schema?.fields ?? {})
				.filter(([, f]) => 'type' in f && (f.type === 'dense_vector' || f.type === 'sparse_vector'))
				.map(([name]) => name),
		);
	}

	_vectorstoreType(): string {
		return 'pinecone-documents';
	}

	async addVectors(): Promise<void> {
		throw new UserError(INSERT_NOT_SUPPORTED);
	}

	async addDocuments(): Promise<void> {
		await this.addVectors();
	}

	async similaritySearch(query: string, k = 4, filter?: object): Promise<Document[]> {
		return (await this.similaritySearchWithScore(query, k, filter)).map(([doc]) => doc);
	}

	async similaritySearchWithScore(
		query: string,
		k = 4,
		filter?: object,
	): Promise<Array<[Document, number]>> {
		if (this.scoreBy.type === 'embed') {
			return await this.search({ type: 'embed', field: this.scoreBy.field, query }, k, filter);
		}
		return await this.similaritySearchVectorWithScore(
			await this.embeddings.embedQuery(query),
			k,
			filter,
		);
	}

	async similaritySearchVectorWithScore(
		values: number[],
		k: number,
		filter?: object,
	): Promise<Array<[Document, number]>> {
		if (this.scoreBy.type === 'embed') {
			throw new UserError(
				`Pinecone embeds queries for field "${this.scoreBy.field}" itself, so this operation needs the query text`,
			);
		}
		return await this.search(
			{ type: 'dense_vector', field: this.scoreBy.field, values },
			k,
			filter,
		);
	}

	private async search(
		scoreBy:
			| { type: 'dense_vector'; field: string; values: number[] }
			| { type: 'embed'; field: string; query: string },
		topK: number,
		filter?: object,
	): Promise<Array<[Document, number]>> {
		const activeFilter = filter && Object.keys(filter).length > 0 ? filter : this.filter;
		const { matches } = await this.index.documents.search({
			scoreBy: [scoreBy],
			topK,
			includeFields: ['*'],
			...(activeFilter && Object.keys(activeFilter).length > 0 ? { filter: activeFilter } : {}),
		});
		return matches.map((match) => [this.toDocument(match), match._score ?? 0]);
	}

	private toDocument({ _id, _score, ...fields }: Record<string, unknown>): Document {
		const textKey =
			this.textField ??
			(typeof fields.text === 'string'
				? 'text'
				: Object.keys(fields).find(
						(key) => typeof fields[key] === 'string' && !this.vectorFields.has(key),
					));
		const metadata: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(fields)) {
			if (key !== textKey && !this.vectorFields.has(key)) metadata[key] = value;
		}
		const content = textKey === undefined ? undefined : fields[textKey];
		return new Document({
			id: typeof _id === 'string' ? _id : undefined,
			pageContent: typeof content === 'string' ? content : '',
			metadata,
		});
	}
}

/**
 * Picks the store that matches the index: the documents API (API version 2026-07) for an
 * index with a document schema, else LangChain's PineconeStore on the vectors API.
 */
export async function getPineconeVectorStore(
	embeddings: EmbeddingsInterface,
	{ apiKey, indexName, namespace, filter, textField }: PineconeVectorStoreArgs,
): Promise<VectorStore> {
	const v9 = new PineconeV9({ apiKey });
	// A failed describe keeps the vectors API path, so classic indexes fail exactly as before
	const model = await describeIndex(v9, apiKey, indexName).catch(() => undefined);
	const scoreBy = model && getDocumentIndexScoring(model);

	if (!model || !scoreBy) {
		const pineconeIndex = new Pinecone({ apiKey }).Index(indexName);
		return await PineconeStore.fromExistingIndex(embeddings, {
			namespace,
			pineconeIndex,
			filter,
		});
	}

	const index = v9.index({ host: model.host, namespace: namespace || undefined });
	return new PineconeDocumentStore(
		embeddings,
		index,
		scoreBy,
		model,
		filter,
		textField || undefined,
	);
}
