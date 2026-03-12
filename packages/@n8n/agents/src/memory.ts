import type { z } from 'zod';

import { InMemoryMemory } from './runtime/memory-store';
import type { BuiltMemory, SemanticRecallConfig } from './types';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

interface MemoryProvider {
	// TODO: Define
}

interface VectorStoreProvider {
	// TODO: Define
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
 *   .lastMessages(20);
 *
 * // Pass to agent — build() is called internally
 * agent.memory(memory);
 * ```
 */
export class Memory {
	private lastMessagesValue: number = DEFAULT_LAST_MESSAGES;

	private semanticRecallConfig?: SemanticRecallConfig;

	private workingMemorySchema?: ZodObjectSchema;

	private memoryProvider?: 'memory' | MemoryProvider;

	private vectorStoreConfig?: { provider: VectorStoreProvider; embedder: string };

	/** The configured number of recent messages to include. */
	get lastMessageCount(): number {
		return this.lastMessagesValue;
	}

	/**
	 * Set the storage provider for conversation history.
	 *
	 * - `'memory'` — in-process memory (default, lost on restart)
	 * - A custom provider instance — for persistent storage
	 */
	storage(provider: 'memory' | MemoryProvider): this {
		this.memoryProvider = provider;
		return this;
	}

	/** Set the number of recent messages to include in context. */
	lastMessages(count: number): this {
		this.lastMessagesValue = count;
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
	 * @param store - A vector store instance (e.g. PgVector, LibSQLVector)
	 * @param embedder - Embedder model ID (e.g. 'openai/text-embedding-3-small')
	 */
	vectorStore(store: VectorStoreProvider, embedder: string): this {
		this.vectorStoreConfig = { provider: store, embedder };
		return this;
	}

	/**
	 * Validate configuration and produce a `BuiltMemory`.
	 *
	 * @throws if `.semanticRecall()` is used without `.vectorStore()`
	 */
	build(): BuiltMemory {
		if (this.semanticRecallConfig && !this.vectorStoreConfig) {
			throw new Error(
				'Memory with .semanticRecall() requires a vector store. ' +
					'Either add .vectorStore(store, embedder) or remove .semanticRecall().',
			);
		}

		// Working memory and vector store are accepted by the API for forward compatibility
		// but not yet implemented in the runtime.
		void this.workingMemorySchema;
		void this.vectorStoreConfig;

		if (this.memoryProvider === 'memory' || !this.memoryProvider) {
			return new InMemoryMemory();
		}

		// Custom BuiltMemory implementation — the provider must conform to the interface
		return this.memoryProvider as unknown as BuiltMemory;
	}
}
