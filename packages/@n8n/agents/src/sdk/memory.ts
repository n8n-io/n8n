import type { z } from 'zod';

import { InMemoryMemory } from '../runtime/memory-store';
import { hasObservationStore } from '../runtime/observation-store';
import { templateFromSchema } from '../runtime/working-memory';
import type {
	BuiltMemory,
	MemoryConfig,
	ObservationalMemoryConfig,
	SemanticRecallConfig,
	TitleGenerationConfig,
} from '../types';
import { DEFAULT_OBSERVATION_GAP_THRESHOLD_MS } from '../types';

const DEFAULT_OBSERVATION_LOCK_TTL_MS = 30_000;
const DEFAULT_OBSERVATION_COMPACTION_THRESHOLD = 5;

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

	private workingMemoryInstruction?: string;

	private memoryBackend?: BuiltMemory;

	private titleGenerationConfig?: TitleGenerationConfig;

	private observationalMemoryConfig?: ObservationalMemoryConfig;

	/** The configured number of recent messages to include. */
	get lastMessageCount(): number {
		return this.lastMessagesValue;
	}

	/**
	 * Set the storage backend for conversation history.
	 *
	 * - `'memory'` — in-process memory (default, lost on restart)
	 * - A `BuiltMemory` instance — for a persistent backend (e.g. cli's `N8nMemory`)
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
	 * Override the default instruction text injected into the system prompt for working memory.
	 *
	 * The instruction tells the model when and how to call the `updateWorkingMemory` tool.
	 * When omitted, `WORKING_MEMORY_DEFAULT_INSTRUCTION` is used.
	 *
	 * Example:
	 * ```typescript
	 * import { WORKING_MEMORY_DEFAULT_INSTRUCTION } from '@n8n/agents';
	 *
	 * memory.instruction(
	 *   WORKING_MEMORY_DEFAULT_INSTRUCTION + '\nAlways update after every user message.',
	 * );
	 * ```
	 */
	instruction(text: string): this {
		this.workingMemoryInstruction = text;
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

	observationalMemory(config: ObservationalMemoryConfig = {}): this {
		this.observationalMemoryConfig = config;
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
				...(this.workingMemoryInstruction !== undefined && {
					instruction: this.workingMemoryInstruction,
				}),
			};
		} else if (this.workingMemoryTemplate !== undefined) {
			workingMemory = {
				template: this.workingMemoryTemplate,
				structured: false,
				scope: this.workingMemoryScope,
				...(this.workingMemoryInstruction !== undefined && {
					instruction: this.workingMemoryInstruction,
				}),
			};
		}

		const baseConfig = {
			memory,
			lastMessages: this.lastMessagesValue,
			workingMemory,
			semanticRecall: this.semanticRecallConfig,
			titleGeneration: this.titleGenerationConfig,
		};

		if (!this.observationalMemoryConfig) {
			return baseConfig;
		}

		if (!hasObservationStore(memory)) {
			throw new Error(
				"Observational memory requires a storage backend that implements BuiltObservationStore (e.g. SqliteMemory or n8n's N8nMemory).",
			);
		}

		if (!workingMemory) {
			throw new Error(
				'Observational memory requires working memory. Add .freeform(template) or .structured(schema) before .observationalMemory().',
			);
		}

		if (workingMemory.scope !== 'thread') {
			throw new Error(
				"Observational memory requires thread-scoped working memory. Add .scope('thread') before .observationalMemory().",
			);
		}

		if (!memory.saveWorkingMemory) {
			throw new Error(
				'Observational memory requires a storage backend that implements saveWorkingMemory().',
			);
		}

		return {
			...baseConfig,
			memory,
			observationalMemory: {
				...this.observationalMemoryConfig,
				lockTtlMs: this.observationalMemoryConfig.lockTtlMs ?? DEFAULT_OBSERVATION_LOCK_TTL_MS,
				compactionThreshold:
					this.observationalMemoryConfig.compactionThreshold ??
					DEFAULT_OBSERVATION_COMPACTION_THRESHOLD,
				trigger: this.observationalMemoryConfig.trigger ?? { type: 'per-turn' },
				gapThresholdMs:
					this.observationalMemoryConfig.gapThresholdMs ??
					(this.observationalMemoryConfig.trigger?.type === 'idle-timer'
						? this.observationalMemoryConfig.trigger.gapThresholdMs
						: undefined) ??
					DEFAULT_OBSERVATION_GAP_THRESHOLD_MS,
			},
		};
	}
}
