import { randomUUID } from 'node:crypto';

import { Document, type DocumentInterface } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';

type Fetch = typeof fetch;

export type DatabricksIndexInfo = {
	name: string;
	primaryKey: string;
	indexType: 'DELTA_SYNC' | 'DIRECT_ACCESS';
	/** Set when Databricks embeds server-side, so the index takes `query_text` only */
	embeddingSourceColumn?: string;
	embeddingModelEndpoint?: string;
	/** Set when the client embeds, so the index takes `query_vector` */
	vectorColumn?: string;
	/** DIRECT_ACCESS: keys of schema_json. DELTA_SYNC: columns_to_sync, or the Unity Catalog columns */
	schemaColumns?: string[];
	sourceTable?: string;
};

export interface DatabricksVectorStoreConfig {
	fetch: Fetch;
	/** https://..., no trailing slash */
	host: string;
	/** catalog.schema.index */
	indexName: string;
	/** Empty falls back to the embedding source column of a managed index */
	contentColumn?: string;
	/** Empty falls back to every schema column except the key, content and vector columns */
	metadataColumns?: string[];
	queryType?: 'ANN' | 'HYBRID';
	/** Default filter when a search passes none (retrieve mode) */
	filter?: Record<string, unknown>;
	/** A pre-described index skips the describe GET */
	index?: DatabricksIndexInfo;
}

// Copy of sanitizeApiMessage in n8n-nodes-base/nodes/Databricks/actions/helpers.ts; the dist
// import would pull that module's @n8n/backend-network graph
function sanitizeMessage(message: string): string {
	// eslint-disable-next-line no-control-regex
	return message.replace(/[\x00-\x1f\x7f]+/g, ' ').slice(0, 500);
}

const FULL_NAME = /^[^/\s]+\.[^/\s]+\.[^/\s]+$/;

// `.` and `..` survive encodeURIComponent, so the shape is checked before a URL is built.
// `sourceTable` comes from the server, so the echoed value is sanitized
function assertFullName(value: string, what: string): void {
	if (!FULL_NAME.test(value)) {
		throw new OperationalError(
			`Invalid Databricks ${what} "${sanitizeMessage(value)}": use catalog.schema.${what}`,
		);
	}
}

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const records = (value: unknown): Array<Record<string, unknown>> =>
	Array.isArray(value) ? value.filter(isRecord) : [];
const stringArray = (value: unknown): string[] | undefined =>
	Array.isArray(value) && value.every((item): item is string => typeof item === 'string')
		? value
		: undefined;

export function parseIndexInfo(raw: unknown): DatabricksIndexInfo {
	const indexType = isRecord(raw) ? raw.index_type : undefined;
	if (
		!isRecord(raw) ||
		typeof raw.name !== 'string' ||
		typeof raw.primary_key !== 'string' ||
		(indexType !== 'DELTA_SYNC' && indexType !== 'DIRECT_ACCESS')
	) {
		throw new OperationalError('Unexpected Databricks index description');
	}

	const deltaSpec = isRecord(raw.delta_sync_index_spec) ? raw.delta_sync_index_spec : undefined;
	const directSpec = isRecord(raw.direct_access_index_spec)
		? raw.direct_access_index_spec
		: undefined;
	const spec = deltaSpec ?? directSpec ?? {};
	const [sourceColumn] = records(spec.embedding_source_columns);
	const [vectorColumn] = records(spec.embedding_vector_columns);

	let schemaColumns: string[] | undefined;
	if (typeof directSpec?.schema_json === 'string') {
		let schema: unknown;
		try {
			schema = JSON.parse(directSpec.schema_json);
		} catch {
			throw new OperationalError('Unexpected Databricks index description');
		}
		schemaColumns = isRecord(schema) ? Object.keys(schema) : undefined;
	} else {
		// A Delta Sync index holds only the synced columns, so prefer them over the source table
		schemaColumns = stringArray(deltaSpec?.columns_to_sync);
	}

	return {
		name: raw.name,
		primaryKey: raw.primary_key,
		indexType,
		embeddingSourceColumn: optionalString(sourceColumn?.name),
		embeddingModelEndpoint: optionalString(sourceColumn?.embedding_model_endpoint_name),
		vectorColumn: optionalString(vectorColumn?.name),
		schemaColumns,
		sourceTable: optionalString(deltaSpec?.source_table),
	};
}

async function databricksRequest(
	fetchFn: Fetch,
	url: string,
	init?: Pick<RequestInit, 'method' | 'body'>,
): Promise<unknown> {
	const response = await fetchFn(url, {
		...init,
		headers: { 'Content-Type': 'application/json' },
	});
	if (!response.ok) {
		// Only the response body reaches the message, so no bearer can leak
		const text = await response.text();
		let message = text;
		try {
			const parsed: unknown = JSON.parse(text);
			if (isRecord(parsed) && typeof parsed.message === 'string') message = parsed.message;
		} catch {}
		throw new OperationalError(
			`Databricks Vector Search request failed (${response.status}): ${sanitizeMessage(message)}`,
		);
	}
	return await response.json();
}

export class DatabricksVectorStore extends VectorStore {
	declare FilterType: Record<string, unknown>;

	private readonly fetch: Fetch;

	private readonly host: string;

	private readonly index: DatabricksIndexInfo;

	private readonly contentColumn: string;

	private readonly metadataColumns: string[];

	/** The Document already carries these as id, pageContent and (on insert) the vector */
	private readonly reserved: Set<string | undefined>;

	private readonly queryType: 'ANN' | 'HYBRID';

	private readonly defaultFilter?: Record<string, unknown>;

	static async describeIndex(
		fetchFn: Fetch,
		host: string,
		indexName: string,
	): Promise<DatabricksIndexInfo> {
		assertFullName(indexName, 'index');
		const info = parseIndexInfo(
			await databricksRequest(
				fetchFn,
				`${host}/api/2.0/vector-search/indexes/${encodeURIComponent(indexName)}`,
			),
		);

		if (info.indexType === 'DELTA_SYNC' && !info.schemaColumns && info.sourceTable) {
			assertFullName(info.sourceTable, 'table');
			const response = await fetchFn(
				`${host}/api/2.1/unity-catalog/tables/${encodeURIComponent(info.sourceTable)}`,
			);
			// No UC privilege on the source table: the dropdown shows nothing and documents are content-only
			if (response.ok) {
				const table: unknown = await response.json();
				info.schemaColumns = records(isRecord(table) ? table.columns : undefined).flatMap(
					(column) => (typeof column.name === 'string' ? [column.name] : []),
				);
			} else {
				await response.body?.cancel();
			}
		}
		return info;
	}

	static async fromExistingIndex(
		embeddings: EmbeddingsInterface,
		config: DatabricksVectorStoreConfig,
	): Promise<DatabricksVectorStore> {
		// ponytail: the node memoizes the describe per run (one execute call or one supplyData
		// closure) and passes `index`; a new run describes again. Cache across runs if it shows up.
		const index =
			config.index ??
			(await DatabricksVectorStore.describeIndex(config.fetch, config.host, config.indexName));
		return new DatabricksVectorStore(embeddings, { ...config, index });
	}

	constructor(
		embeddings: EmbeddingsInterface,
		config: DatabricksVectorStoreConfig & { index: DatabricksIndexInfo },
	) {
		super(embeddings, config);
		const { index } = config;
		const contentColumn = config.contentColumn || index.embeddingSourceColumn;
		if (!contentColumn) {
			throw new UserError(
				`Index ${index.name} uses self-managed embeddings. Select a content column`,
			);
		}
		this.fetch = config.fetch;
		this.host = config.host;
		this.index = index;
		this.contentColumn = contentColumn;
		this.reserved = new Set([index.primaryKey, contentColumn, index.vectorColumn]);
		this.metadataColumns = config.metadataColumns?.length
			? config.metadataColumns
			: (index.schemaColumns ?? []).filter((column) => !this.reserved.has(column));
		this.queryType = config.queryType ?? 'ANN';
		this.defaultFilter = config.filter;
	}

	_vectorstoreType(): string {
		return 'databricks';
	}

	private get isManaged(): boolean {
		return this.index.embeddingSourceColumn !== undefined;
	}

	// The factory calls this on load and retrieve-as-tool (searchByText)
	async similaritySearchWithScore(
		query: string,
		k = 4,
		filter?: this['FilterType'],
	): Promise<Array<[Document, number]>> {
		if (this.isManaged) {
			return await this.query(
				{ num_results: k, query_type: this.queryType, query_text: query },
				filter,
			);
		}
		return await this.query(
			{
				num_results: k,
				query_type: this.queryType,
				query_vector: await this.embeddings.embedQuery(query),
				// HYBRID needs the text next to the vector
				...(this.queryType === 'HYBRID' && { query_text: query }),
			},
			filter,
		);
	}

	// The retriever calls this on retrieve; the base version would embed first
	async similaritySearch(query: string, k = 4, filter?: this['FilterType']): Promise<Document[]> {
		return (await this.similaritySearchWithScore(query, k, filter)).map(([doc]) => doc);
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: this['FilterType'],
	): Promise<Array<[Document, number]>> {
		if (this.isManaged) {
			throw new UserError(
				`Index ${this.index.name} uses Databricks-managed embeddings and accepts text queries only`,
			);
		}
		// HYBRID needs text this path does not have
		return await this.query({ num_results: k, query_type: 'ANN', query_vector: query }, filter);
	}

	async addDocuments(
		documents: DocumentInterface[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		if (documents.length === 0) return [];
		this.assertDirectAccess();
		const vectors = await this.embeddings.embedDocuments(documents.map((doc) => doc.pageContent));
		return await this.addVectors(vectors, documents, options);
	}

	async addVectors(
		vectors: number[][],
		documents: DocumentInterface[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		const vectorColumn = this.assertDirectAccess();
		const { primaryKey, name } = this.index;
		const schemaColumns = new Set(this.index.schemaColumns ?? []);
		const ids = documents.map((doc, i) => options?.ids?.[i] ?? doc.id ?? randomUUID());

		// The loaders add keys like `source` and `loc` that would 400 against the schema
		const rows = documents.map((doc, i) => ({
			...Object.fromEntries(
				Object.entries(doc.metadata).filter(
					([key]) => schemaColumns.has(key) && !this.reserved.has(key),
				),
			),
			[primaryKey]: ids[i],
			[this.contentColumn]: doc.pageContent,
			[vectorColumn]: vectors[i],
		}));

		const response = await databricksRequest(
			this.fetch,
			`${this.host}/api/2.0/vector-search/indexes/${encodeURIComponent(name)}/upsert-data`,
			{ method: 'POST', body: JSON.stringify({ inputs_json: JSON.stringify(rows) }) },
		);
		if (!isRecord(response) || response.status !== 'SUCCESS') {
			const result = isRecord(response) && isRecord(response.result) ? response.result : {};
			const failed = stringArray(result.failed_primary_keys) ?? [];
			throw new OperationalError(
				`Databricks rejected the upsert into ${name}. Failed primary keys: ${failed.join(', ')}`,
			);
		}
		return ids;
	}

	// Databricks enforces `index_type` here; a Delta Sync index rejects upsert-data even when it holds its own vectors
	private assertDirectAccess(): string {
		const { indexType, vectorColumn, name } = this.index;
		if (indexType !== 'DIRECT_ACCESS') {
			throw new UserError(
				`Index ${name} syncs from its source table. Use a Direct Access index to insert documents`,
			);
		}
		if (!vectorColumn) {
			throw new OperationalError('Unexpected Databricks index description');
		}
		return vectorColumn;
	}

	private async query(
		body: Record<string, unknown>,
		filter?: Record<string, unknown>,
	): Promise<Array<[Document, number]>> {
		const { primaryKey, name } = this.index;
		const columns = [...new Set([primaryKey, this.contentColumn, ...this.metadataColumns])];
		const effectiveFilter = filter ?? this.defaultFilter;
		const filtersJson =
			effectiveFilter && Object.keys(effectiveFilter).length > 0
				? JSON.stringify(effectiveFilter)
				: undefined;

		const response = await databricksRequest(
			this.fetch,
			`${this.host}/api/2.0/vector-search/indexes/${encodeURIComponent(name)}/query`,
			{
				method: 'POST',
				body: JSON.stringify({
					...body,
					columns,
					...(filtersJson && { filters_json: filtersJson }),
				}),
			},
		);

		// Databricks returns the requested columns plus `score`; read every cell by manifest name
		const manifest = isRecord(response) && isRecord(response.manifest) ? response.manifest : {};
		const result = isRecord(response) && isRecord(response.result) ? response.result : {};
		const names = records(manifest.columns).map((column) => optionalString(column.name) ?? '');
		const rows = Array.isArray(result.data_array)
			? result.data_array.filter((row): row is unknown[] => Array.isArray(row))
			: [];
		if (rows.length === 0) return [];

		const position = (index: number) => {
			if (index < 0) throw new OperationalError('Unexpected Databricks query response');
			return index;
		};
		const contentAt = position(names.indexOf(this.contentColumn));
		const idAt = position(names.indexOf(primaryKey));
		// Databricks appends score last, so a user column named score does not shadow it
		const scoreAt = position(names.lastIndexOf('score'));
		const metadataAt = this.metadataColumns.map(
			(column) => [column, position(names.indexOf(column))] as const,
		);

		return rows.map((row) => [
			new Document({
				pageContent: String(row[contentAt] ?? ''),
				metadata: Object.fromEntries(metadataAt.map(([column, at]) => [column, row[at]])),
				id: String(row[idAt]),
			}),
			Number(row[scoreAt]),
		]);
	}
}
