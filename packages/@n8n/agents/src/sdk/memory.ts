import {
	hasEpisodicMemoryStore,
	isEpisodicMemoryEnabled,
	withEpisodicMemoryDefaults,
} from '../runtime/episodic-memory';
import { InMemoryMemory } from '../runtime/memory-store';
import { hasObservationLogStore } from '../runtime/observation-log-store';
import type {
	BuiltMemory,
	EpisodicMemoryConfig,
	MemoryConfig,
	ObservationalMemoryConfig,
	SemanticRecallConfig,
	TitleGenerationConfig,
} from '../types';

const DEFAULT_LAST_MESSAGES = 10;

export function normalizeMemoryConfig(config: MemoryConfig): MemoryConfig {
	if (!config.observationalMemory) {
		return config;
	}

	if (!hasObservationLogStore(config.memory)) {
		throw new Error(
			"Observational memory requires a storage backend that implements BuiltObservationLogStore (e.g. n8n's N8nMemory).",
		);
	}

	return {
		...config,
		observationLog: {
			...config.observationLog,
			...(config.observationalMemory.renderTokenBudget !== undefined && {
				renderTokenBudget: config.observationalMemory.renderTokenBudget,
			}),
		},
	};
}

function validateObservationalMemoryConfig(config: ObservationalMemoryConfig): void {
	if (config.observe && config.observerThresholdTokens === undefined) {
		throw new Error(
			'Observational memory observe callback requires observerThresholdTokens. Add observerThresholdTokens or remove observe.',
		);
	}
	if (config.reflect && config.reflectorThresholdTokens === undefined) {
		throw new Error(
			'Observational memory reflect callback requires reflectorThresholdTokens. Add reflectorThresholdTokens or remove reflect.',
		);
	}
}

/**
 * Builder for configuring conversation memory.
 *
 * Usage:
 * ```typescript
 * const memory = new Memory()
 *   .storage('memory')
 *   .lastMessages(20)
 *   .observationalMemory({ renderTokenBudget: 8000 });
 *
 * agent.memory(memory);
 * ```
 */
export class Memory {
	private lastMessagesValue: number = DEFAULT_LAST_MESSAGES;

	private semanticRecallConfig?: SemanticRecallConfig;

	private episodicMemoryConfig?: EpisodicMemoryConfig;

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

	/** Enable source-backed cross-session episodic memory. */
	episodicMemory(config: EpisodicMemoryConfig = {}): this {
		if (config.enabled === false) {
			this.episodicMemoryConfig = undefined;
		} else {
			this.episodicMemoryConfig = config;
		}
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
	 * @throws if `.semanticRecall()` is used with a backend that doesn't support search()
	 */
	build(): MemoryConfig {
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

		if (isEpisodicMemoryEnabled(this.episodicMemoryConfig)) {
			if (!hasEpisodicMemoryStore(memory)) {
				throw new Error(
					'Episodic memory requires a storage backend that implements BuiltEpisodicMemoryStore.',
				);
			}
			withEpisodicMemoryDefaults(this.episodicMemoryConfig);
		}

		const baseConfig = {
			memory,
			lastMessages: this.lastMessagesValue,
			semanticRecall: this.semanticRecallConfig,
			episodicMemory: this.episodicMemoryConfig,
			titleGeneration: this.titleGenerationConfig,
		};

		if (!this.observationalMemoryConfig) {
			return normalizeMemoryConfig(baseConfig);
		}

		if (!hasObservationLogStore(memory)) {
			throw new Error(
				"Observational memory requires a storage backend that implements BuiltObservationLogStore (e.g. n8n's N8nMemory).",
			);
		}
		validateObservationalMemoryConfig(this.observationalMemoryConfig);

		return normalizeMemoryConfig({
			...baseConfig,
			memory,
			observationalMemory: this.observationalMemoryConfig,
		});
	}
}
