import type { z } from 'zod';

import { InMemoryMemory } from '../runtime/memory-store';
import { templateFromSchema } from '../runtime/working-memory';
import type {
	BuiltMemory,
	MemoryConfig,
	SemanticRecallConfig,
	TitleGenerationConfig,
} from '../types';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

const DEFAULT_LAST_MESSAGES = 10;

/**
 * Builder for configuring conversation memory.
 *
 * Usage:
 * ```typescript
 * const memory = new Memory()
 *   .storage('memory')
 *   .lastMessages(20)
 *   .freeform('# User Context\n- **Name**:\n- **City**:');
 *
 * agent.memory(memory);
 * ```
 */
export class Memory {
	private lastMessagesValue: number = DEFAULT_LAST_MESSAGES;

	private semanticRecallConfig?: SemanticRecallConfig;

	private workingMemorySchema?: ZodObjectSchema;

	private workingMemoryTemplate?: string;

	private workingMemoryScope: 'resource' | 'thread' = 'resource';

	private memoryBackend?: BuiltMemory;

	private titleGenerationConfig?: TitleGenerationConfig;

	/** The configured number of recent messages to include. */
	get lastMessageCount(): number {
		return this.lastMessagesValue;
	}

	/**
	 * Set the storage backend for conversation history.
	 *
	 * - `'memory'` — in-process memory (default, lost on restart)
	 * - A `BuiltMemory` instance — for persistent storage (e.g. SqliteMemory)
	 */
	storage(backend: 'memory' | BuiltMemory): this {
		if (backend === 'memory') {
			this.memoryBackend = undefined;
		} else {
			this.memoryBackend = backend;
		}
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

	/**
	 * Enable structured working memory with a Zod schema.
	 * Mutually exclusive with `.freeform()`.
	 */
	structured(schema: ZodObjectSchema): this {
		this.workingMemorySchema = schema;
		return this;
	}

	/**
	 * Enable free-form working memory with a markdown/text template.
	 * Mutually exclusive with `.structured()`.
	 */
	freeform(template: string): this {
		this.workingMemoryTemplate = template;
		return this;
	}

	/**
	 * Set the working memory scope.
	 *
	 * - `'resource'` (default) — working memory is shared across all threads for the same resource/user.
	 * - `'thread'` — working memory is scoped to a single conversation thread.
	 */
	scope(s: 'resource' | 'thread'): this {
		this.workingMemoryScope = s;
		return this;
	}

	/**
	 * Enable automatic title generation for new threads.
	 *
	 * - `true` — uses the agent's own model and default instructions.
	 * - `{ model, instructions }` — custom model and/or custom instructions.
	 *
	 * Titles are generated once per thread (only when the thread has no title)
	 * and run asynchronously so they never block the agent response.
	 */
	titleGeneration(config: boolean | TitleGenerationConfig): this {
		if (config === true) {
			this.titleGenerationConfig = {};
		} else if (config === false) {
			this.titleGenerationConfig = undefined;
		} else {
			this.titleGenerationConfig = config;
		}
		return this;
	}

	/**
	 * Validate configuration and produce a `MemoryConfig`.
	 *
	 * @throws if both `.structured()` and `.freeform()` are used
	 * @throws if `.freeform()` template is empty
	 * @throws if `.semanticRecall()` is used with a backend that doesn't support search()
	 */
	build(): MemoryConfig {
		if (this.workingMemorySchema && this.workingMemoryTemplate !== undefined) {
			throw new Error(
				'Working memory cannot use both .structured() and .freeform(). ' +
					'Choose one: .structured(zodSchema) for typed state, or .freeform(template) for free-form text.',
			);
		}

		if (this.workingMemoryTemplate !== undefined && this.workingMemoryTemplate.trim() === '') {
			throw new Error(
				'Free-form working memory template cannot be empty. ' +
					'Provide a markdown template with slots for the agent to fill.',
			);
		}

		const memory: BuiltMemory = this.memoryBackend ?? new InMemoryMemory();

		if (this.semanticRecallConfig) {
			if (!memory.queryEmbeddings && !memory.search) {
				throw new Error(
					'Semantic recall requires a storage backend with queryEmbeddings() or search() support.',
				);
			}
			if (!memory.search && !this.semanticRecallConfig.embedder) {
				throw new Error(
					'Semantic recall requires an embedder when using queryEmbeddings(). Add embedder to your semanticRecall config: ' +
						".semanticRecall({ topK: 5, embedder: 'openai/text-embedding-3-small' })",
				);
			}
		}

		let workingMemory: MemoryConfig['workingMemory'];
		if (this.workingMemorySchema) {
			workingMemory = {
				template: templateFromSchema(this.workingMemorySchema),
				structured: true,
				schema: this.workingMemorySchema,
				scope: this.workingMemoryScope,
			};
		} else if (this.workingMemoryTemplate !== undefined) {
			workingMemory = {
				template: this.workingMemoryTemplate,
				structured: false,
				scope: this.workingMemoryScope,
			};
		}

		return {
			memory,
			lastMessages: this.lastMessagesValue,
			workingMemory,
			semanticRecall: this.semanticRecallConfig,
			titleGeneration: this.titleGenerationConfig,
		};
	}
}
