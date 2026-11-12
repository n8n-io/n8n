import { createHash } from 'node:crypto';

import { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { isRecord } from '@n8n/utils/is-record';
import type { IExecuteFunctions, IHttpRequestOptions, ISupplyDataFunctions } from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';

// @langchain/pinecone needs SDK 5 (API 2025-01), and the first SDK with the documents API (v9)
// can't be installed next to it (pnpm deploy rejects two versions of one peer). So the
// documents API is called directly. Docs: https://docs.pinecone.io/guides/index-data/adopt-the-documents-api
const API_VERSION = '2026-07';
const CONTROL_PLANE = 'https://api.pinecone.io';

type ScoreBy = { type: 'dense_vector' | 'embed'; field: string };
type SchemaField = Record<string, unknown>;

/** The parts of the 2026-07 describe-index response the nodes read */
export interface PineconeIndexModel {
	name: string;
	/** `https://<host>`, validated as a Pinecone host */
	host: string;
	ready: boolean;
	fields: Record<string, SchemaField>;
}

/** Sends a request with the credential's Api-Key header and the n8n egress rules */
type PineconeRequest = (options: IHttpRequestOptions) => Promise<unknown>;

export interface PineconeConnection {
	context: IExecuteFunctions | ISupplyDataFunctions;
	/** `pineconeApi`, or a credential that extends it */
	credentialType: string;
	/** For the SDK 5 client of the vectors API path, and the describe cache key */
	apiKey: string;
}

export interface PineconeVectorStoreArgs {
	indexName: string;
	/** Passed as is to the vectors API path. An empty value selects the default namespace */
	namespace?: string;
	filter?: object;
	/** Document indexes only: the field that holds the page content */
	textField?: string;
}

const toRequest =
	({ context, credentialType }: PineconeConnection): PineconeRequest =>
	async (options) =>
		await context.helpers.httpRequestWithAuthentication.call(context, credentialType, {
			...options,
			headers: { ...options.headers, 'X-Pinecone-API-Version': API_VERSION },
			json: true,
		});

// The data plane request carries the API key, so only HTTPS hosts of Pinecone get it
function parseDataPlaneHost(host: string): string | undefined {
	try {
		const url = new URL(/^[a-z]+:\/\//i.test(host) ? host : `https://${host}`);
		return url.protocol === 'https:' && url.hostname.endsWith('.pinecone.io')
			? `https://${url.host}`
			: undefined;
	} catch {
		return undefined;
	}
}

export function parseIndexModel(raw: unknown): PineconeIndexModel {
	const host =
		isRecord(raw) && typeof raw.host === 'string' ? parseDataPlaneHost(raw.host) : undefined;
	if (!isRecord(raw) || typeof raw.name !== 'string' || !host) {
		throw new OperationalError('Unexpected Pinecone index description');
	}
	const fields = isRecord(raw.schema) && isRecord(raw.schema.fields) ? raw.schema.fields : {};
	return {
		name: raw.name,
		host,
		ready: isRecord(raw.status) && raw.status.ready === true,
		fields: Object.fromEntries(
			Object.entries(fields).filter((entry): entry is [string, SchemaField] => isRecord(entry[1])),
		),
	};
}

// The schema of an index can't change after creation, so a short cache only guards
// against a recreated index with the same name.
// ponytail: in-process TTL cache, one describe per index per minute on each main/worker
const DESCRIBE_TTL_MS = 60_000;
const describeCache = new Map<string, { expires: number; model: Promise<PineconeIndexModel> }>();

async function describeIndex(connection: PineconeConnection, indexName: string) {
	// Keyed by a hash, so the cache holds no API key
	const key = createHash('sha256').update(`${connection.apiKey}\0${indexName}`).digest('hex');
	const now = Date.now();
	const cached = describeCache.get(key);
	if (cached && cached.expires > now) return await cached.model;

	for (const [k, entry] of describeCache) if (entry.expires <= now) describeCache.delete(k);
	const model = toRequest(connection)({
		method: 'GET',
		url: `${CONTROL_PLANE}/indexes/${encodeURIComponent(indexName)}`,
	}).then(parseIndexModel);
	describeCache.set(key, { expires: now + DESCRIBE_TTL_MS, model });
	try {
		return await model;
	} catch (error) {
		describeCache.delete(key);
		throw error;
	}
}

/** A failed describe keeps the vectors API path, so classic indexes fail exactly as before */
const tryDescribeIndex = async (connection: PineconeConnection, indexName: string) =>
	await describeIndex(connection, indexName).catch(() => undefined);

const typeOf = (field: SchemaField) => (typeof field.type === 'string' ? field.type : undefined);
const isVectorField = (field: SchemaField) =>
	typeOf(field) === 'dense_vector' || typeOf(field) === 'sparse_vector';
const RESERVED_VECTOR_FIELDS = new Set(['_values', '_sparse_values']);

/**
 * Port of `classifyIndexShape` in Pinecone SDK 9 (src/control/indexes/legacyAccessors.ts,
 * https://github.com/pinecone-io/pinecone-ts-client). Only the reserved `_values` and
 * `_sparse_values` vector fields select the vectors API. Semantic and metadata fields don't count.
 */
export function classifyIndexShape(
	model: PineconeIndexModel,
): 'vectors-api' | 'documents-api' | 'indeterminate' {
	const entries = Object.entries(model.fields);
	const vectors = entries.filter(([, f]) => isVectorField(f));
	if (vectors.length === 0) {
		return entries.length === 0 && !model.ready ? 'indeterminate' : 'documents-api';
	}
	const reserved = vectors.filter(([name]) => RESERVED_VECTOR_FIELDS.has(name)).length;
	if (reserved === vectors.length) return 'vectors-api';
	return reserved === 0 ? 'documents-api' : 'indeterminate';
}

/** Indexes still initializing ('indeterminate') stay on the vectors API */
function isDocumentIndex(model: PineconeIndexModel): boolean {
	if (classifyIndexShape(model) !== 'documents-api') return false;
	// A legacy integrated index has a semantic_text field and no vector fields, and the
	// Records API still serves it
	return !Object.values(model.fields).some((f) => typeOf(f) === 'semantic_text');
}

const INSERT_NOT_SUPPORTED =
	'Inserting into a Pinecone index with a document schema is not supported yet. Use an index without a document schema to insert documents with n8n';

/**
 * Throws for an index with a document schema: the vectors API rejects its upserts.
 * Runs before any namespace is cleared.
 */
export async function assertPineconeIndexAcceptsVectors(
	connection: PineconeConnection,
	indexName: string,
): Promise<void> {
	const model = await tryDescribeIndex(connection, indexName);
	if (model && isDocumentIndex(model)) throw new UserError(INSERT_NOT_SUPPORTED);
}

/**
 * Returns how to score a search on an index with a document schema, or `undefined` for an
 * index that the vectors API serves (classic indexes, legacy integrated indexes, and
 * indexes that are still initializing).
 * If the schema has a dense vector field and an integrated embedding field, the dense field
 * wins, because the connected embeddings model populated it. Else the first field of a kind wins.
 */
export function getDocumentIndexScoring(model: PineconeIndexModel): ScoreBy | undefined {
	if (!isDocumentIndex(model)) return undefined;

	const fields = Object.entries(model.fields);
	const dense = fields.find(([, f]) => typeOf(f) === 'dense_vector');
	if (dense) return { type: 'dense_vector', field: dense[0] };
	const embed = fields.find(([, f]) => typeOf(f) === 'string' && isRecord(f.embed));
	if (embed) return { type: 'embed', field: embed[0] };

	throw new UserError(
		`Pinecone index "${model.name}" has no dense vector field or integrated embedding field to search`,
	);
}

type ScoringClause =
	| { type: 'dense_vector'; field: string; values: number[] }
	| { type: 'embed'; field: string; query: string };

export class PineconeDocumentStore extends VectorStore {
	declare FilterType: object;

	private readonly vectorFields: Set<string>;

	private readonly searchUrl: string;

	constructor(
		embeddings: EmbeddingsInterface,
		private readonly request: PineconeRequest,
		private readonly scoreBy: ScoreBy,
		model: PineconeIndexModel,
		namespace?: string,
		private readonly filter?: object,
		private readonly textField?: string,
	) {
		super(embeddings, {});
		this.vectorFields = new Set(
			Object.entries(model.fields)
				.filter(([, f]) => isVectorField(f))
				.map(([name]) => name),
		);
		// The 2026-07 API names the default namespace `__default__`, as SDK 9 does
		const ns = encodeURIComponent(namespace || '__default__');
		this.searchUrl = `${model.host}/namespaces/${ns}/documents/search`;
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
		scoreBy: ScoringClause,
		topK: number,
		filter?: object,
	): Promise<Array<[Document, number]>> {
		const activeFilter = filter && Object.keys(filter).length > 0 ? filter : this.filter;
		const response = await this.request({
			method: 'POST',
			url: this.searchUrl,
			body: {
				score_by: [scoreBy],
				top_k: topK,
				include_fields: ['*'],
				...(activeFilter && Object.keys(activeFilter).length > 0 ? { filter: activeFilter } : {}),
			},
		});
		const matches = isRecord(response) && Array.isArray(response.matches) ? response.matches : [];
		return matches
			.filter(isRecord)
			.map((match) => [
				this.toDocument(match),
				typeof match._score === 'number' ? match._score : 0,
			]);
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
	connection: PineconeConnection,
	embeddings: EmbeddingsInterface,
	{ indexName, namespace, filter, textField }: PineconeVectorStoreArgs,
): Promise<VectorStore> {
	const model = await tryDescribeIndex(connection, indexName);
	const scoreBy = model && getDocumentIndexScoring(model);

	if (!model || !scoreBy) {
		const pineconeIndex = new Pinecone({ apiKey: connection.apiKey }).Index(indexName);
		return await PineconeStore.fromExistingIndex(embeddings, { namespace, pineconeIndex, filter });
	}

	return new PineconeDocumentStore(
		embeddings,
		toRequest(connection),
		scoreBy,
		model,
		namespace,
		filter,
		textField || undefined,
	);
}
