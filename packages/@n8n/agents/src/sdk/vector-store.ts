import type { EmbeddingModel } from 'ai';
import { z } from 'zod';

import { Tool } from './tool';
import {
	assertValidFilter,
	buildFilterInputSchema,
	normalizeFilterInput,
	type VectorFilterInput,
} from './vector-store-filter';
import {
	createEmbeddingModel,
	type EmbeddingProviderOptions,
} from '../runtime/model/model-factory';
import type { BuiltVectorStoreBackend, VectorDocument, VectorQueryResult } from '../types';
import type { VectorFilter } from '../types/sdk/vector-store';

const DEFAULT_TOP_K = 4;

/**
 * Builder that pairs a vector store backend with an embedding model and owns
 * the embed-then-search / embed-then-upsert orchestration. Backends operate
 * purely on vectors; this class is the only place text gets embedded.
 *
 * Usage:
 * ```typescript
 * const knowledge = new VectorStore('product-docs')
 *   .store(new PgVectorStore('product-docs', { connectionString: '...' }))
 *   .embeddingModel('openai/text-embedding-3-small')
 *   .description('Search the product documentation');
 *
 * await knowledge.addDocuments([{ content: 'Refunds take 5 days.' }]);
 * agent.vectorStore(knowledge);
 * ```
 */
export class VectorStore {
	private backend?: BuiltVectorStoreBackend;

	private embeddingModelValue?: EmbeddingModel;

	private topKValue: number = DEFAULT_TOP_K;

	private descriptionValue?: string;

	private ensureReadyPromise?: Promise<void>;

	constructor(private readonly name: string) {}

	/** Set the vector store backend (e.g. `new PgVectorStore(...)`). Required before building. */
	store(backend: BuiltVectorStoreBackend): this {
		this.backend = backend;
		return this;
	}

	/**
	 * Set the embedding model used to embed queries and documents.
	 * Accepts a "provider/model" string (e.g. `openai/text-embedding-3-small`)
	 * resolved via {@link createEmbeddingModel}, or a pre-built AI SDK `EmbeddingModel`.
	 * Required before building.
	 */
	embeddingModel(
		model: string | EmbeddingModel,
		options?: string | EmbeddingProviderOptions,
	): this {
		this.embeddingModelValue =
			typeof model === 'string' ? createEmbeddingModel(model, options) : model;
		return this;
	}

	/** Set the default number of results returned by `.search()`. Default: 4. */
	topK(k: number): this {
		this.topKValue = k;
		return this;
	}

	/** Set the description used by `.asTool()` when no per-call description is given. */
	description(text: string): this {
		this.descriptionValue = text;
		return this;
	}

	/** Search the store for content semantically similar to `query`. Lazy-builds on first call. */
	async search(
		query: string,
		opts?: { topK?: number; filter?: VectorFilterInput },
	): Promise<VectorQueryResult[]> {
		const { backend, embeddingModel } = this.ensureBuilt();
		const { embed } = await import('ai');
		const { embedding } = await embed({ model: embeddingModel, value: query });
		await this.ensureBackendReady(backend, embedding.length);
		const filter = this.resolveFilter(opts?.filter);
		return await backend.query(embedding, {
			topK: opts?.topK ?? this.topKValue,
			...(filter ? { filter } : {}),
		});
	}

	/** Embed and upsert documents into the store. Returns the ids used (generated when not provided). */
	async addDocuments(docs: VectorDocument[]): Promise<string[]> {
		if (docs.length === 0) return [];

		const { backend, embeddingModel } = this.ensureBuilt();
		const ids = docs.map((doc) => doc.id ?? crypto.randomUUID());
		const { embedMany } = await import('ai');
		const { embeddings } = await embedMany({
			model: embeddingModel,
			values: docs.map((doc) => doc.content),
		});
		await this.ensureBackendReady(backend, embeddings[0]?.length ?? 0);
		await backend.upsert(
			docs.map((doc, index) => ({
				id: ids[index],
				vector: embeddings[index],
				content: doc.content,
				metadata: doc.metadata ?? {},
			})),
		);
		return ids;
	}

	/** Delete documents from the store by id. */
	async deleteDocuments(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		const { backend } = this.ensureBuilt();
		await backend.delete({ ids });
	}

	/**
	 * Expose this store as an agent tool. The model calls it with a natural
	 * language `query` and receives ranked search results.
	 *
	 * Pass `filterableKeys` to also let the model narrow results with a
	 * metadata filter — a map from each filterable metadata key to a
	 * human-readable description of its values, injected into the tool's
	 * input schema.
	 */
	asTool(opts?: {
		name?: string;
		description?: string;
		filterableKeys?: Record<string, string>;
	}): Tool {
		const description = opts?.description ?? this.descriptionValue;
		if (!description) {
			throw new Error(
				`VectorStore "${this.name}" requires a description — set it via .description() or asTool({ description })`,
			);
		}

		const toolName = opts?.name ?? `search_${sanitizeToolName(this.name)}`;

		if (!opts?.filterableKeys) {
			return new Tool(toolName)
				.description(description)
				.input(z.object({ query: z.string().describe('Natural language search query') }))
				.handler(async ({ query }) => ({ results: await this.search(query) }));
		}

		const filterSchema = buildFilterInputSchema(opts.filterableKeys);
		return new Tool(toolName)
			.description(description)
			.input(
				z.object({
					query: z.string().describe('Natural language search query'),
					filter: filterSchema,
				}),
			)
			.handler(async ({ query, filter }) => ({
				results: await this.search(
					query,
					filter && filter.length > 0
						? { filter: { conditions: filter, combineWith: 'and' } }
						: undefined,
				),
			}));
	}

	private ensureBuilt(): { backend: BuiltVectorStoreBackend; embeddingModel: EmbeddingModel } {
		if (!this.backend) {
			throw new Error(`VectorStore "${this.name}" requires a backend — set it via .store()`);
		}
		if (!this.embeddingModelValue) {
			throw new Error(
				`VectorStore "${this.name}" requires an embedding model — set it via .embeddingModel()`,
			);
		}
		return { backend: this.backend, embeddingModel: this.embeddingModelValue };
	}

	/**
	 * Normalize and validate a per-call/model filter. Returns `undefined` for
	 * an empty filter (e.g. `{}`) so it never turns into a no-op `WHERE` clause.
	 */
	private resolveFilter(input?: VectorFilterInput): VectorFilter | undefined {
		if (input === undefined) return undefined;
		const normalized = normalizeFilterInput(input);
		assertValidFilter(normalized);
		return normalized.conditions.length > 0 ? normalized : undefined;
	}

	private async ensureBackendReady(
		backend: BuiltVectorStoreBackend,
		dimensions: number,
	): Promise<void> {
		if (!backend.ensureReady) return;
		if (!this.ensureReadyPromise) {
			const p = backend.ensureReady({ dimensions });
			this.ensureReadyPromise = p;
			p.catch(() => {
				if (this.ensureReadyPromise === p) this.ensureReadyPromise = undefined;
			});
		}
		await this.ensureReadyPromise;
	}
}

function sanitizeToolName(name: string): string {
	return name.replace(/[^a-zA-Z0-9_]/g, '_');
}
