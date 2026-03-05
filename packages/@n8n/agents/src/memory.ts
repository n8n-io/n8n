import { InMemoryStore } from '@mastra/core/storage';
import type { MastraCompositeStore } from '@mastra/core/storage';
import type { MastraVector } from '@mastra/core/vector';
import { Memory as MastraMemory } from '@mastra/memory';
import type { z } from 'zod';

import type { BuiltMemory, SemanticRecallConfig } from './types';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

interface VectorStoreConfig {
	store: MastraVector;
	embedder: string;
}

const DEFAULT_LAST_MESSAGES = 10;

/**
 * Builder for configuring conversation memory.
 *
 * Usage:
 * ```typescript
 * // In-memory storage (default, lost on restart)
 * const memory = new Memory()
 *   .storage('memory')
 *   .lastMessages(20)
 *   .build();
 *
 * // Custom storage provider (e.g. @mastra/libsql, @mastra/pg)
 * const memory = new Memory()
 *   .storage(myLibSqlStore)
 *   .lastMessages(20)
 *   .semanticRecall({ topK: 4 })
 *   .vectorStore(myVector, 'openai/text-embedding-3-small')
 *   .build();
 * ```
 */
export class Memory {
	private lastMessageCount: number = DEFAULT_LAST_MESSAGES;

	private semanticRecallConfig?: SemanticRecallConfig;

	private workingMemorySchema?: ZodObjectSchema;

	private vectorStoreConfig?: VectorStoreConfig;

	private storageProvider?: MastraCompositeStore;

	/**
	 * Set the storage provider for conversation history.
	 *
	 * - `'memory'` — in-process memory (default, lost on restart)
	 * - A `MastraCompositeStore` instance — for persistent storage
	 *   (e.g. `new LibSQLStore(...)` from `@mastra/libsql`,
	 *   `new PgStore(...)` from `@mastra/pg`)
	 */
	storage(provider: 'memory' | MastraCompositeStore): this {
		if (provider === 'memory') {
			this.storageProvider = new InMemoryStore();
		} else {
			this.storageProvider = provider;
		}
		return this;
	}

	/** Set the number of recent messages to include in context. */
	lastMessages(count: number): this {
		this.lastMessageCount = count;
		return this;
	}

	/** Enable semantic recall (RAG-based retrieval of relevant past messages). */
	semanticRecall(config: SemanticRecallConfig): this {
		this.semanticRecallConfig = config;
		return this;
	}

	/** Enable working memory with a Zod schema for persistent user data. */
	workingMemory(schema: ZodObjectSchema): this {
		this.workingMemorySchema = schema;
		return this;
	}

	/**
	 * Set the vector store and embedder for semantic recall.
	 * Required when using `.semanticRecall()`.
	 *
	 * @param store - A MastraVector instance (e.g. PgVector, LibSQLVector)
	 * @param embedder - Embedder model ID (e.g. 'openai/text-embedding-3-small')
	 */
	vectorStore(store: MastraVector, embedder: string): this {
		this.vectorStoreConfig = { store, embedder };
		return this;
	}

	/**
	 * Validate configuration and produce a `BuiltMemory`.
	 *
	 * @throws if `.semanticRecall()` is used without `.vectorStore()`
	 * @throws if no storage provider is configured
	 */
	build(): BuiltMemory {
		if (this.semanticRecallConfig && !this.vectorStoreConfig) {
			throw new Error(
				'Memory with .semanticRecall() requires a vector store. ' +
					'Either add .vectorStore(store, embedder) or remove .semanticRecall().',
			);
		}

		if (!this.storageProvider) {
			throw new Error(
				'Memory requires a storage provider. ' +
					"Add .storage('memory') for in-process storage, " +
					'or pass a persistent store (e.g. LibSQLStore, PgStore).',
			);
		}

		const semanticRecall = this.semanticRecallConfig
			? {
					topK: this.semanticRecallConfig.topK,
					messageRange: this.semanticRecallConfig.messageRange ?? 0,
				}
			: false;

		const workingMemory = this.workingMemorySchema
			? { enabled: true as const, schema: this.workingMemorySchema }
			: undefined;

		const mastraMemory = new MastraMemory({
			storage: this.storageProvider,
			options: {
				lastMessages: this.lastMessageCount,
				semanticRecall,
				...(workingMemory ? { workingMemory } : {}),
			},
		});

		if (this.vectorStoreConfig) {
			mastraMemory.setVector(this.vectorStoreConfig.store);
			mastraMemory.setEmbedder(this.vectorStoreConfig.embedder);
		}

		return {
			_mastraMemory: mastraMemory,
		};
	}
}
