import { hasEpisodicMemoryStore, isEpisodicMemoryEnabled } from '../runtime/episodic-memory';
import {
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	DEFAULT_EPISODIC_MEMORY_HALF_LIFE_DAYS,
	DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
	DEFAULT_EPISODIC_MEMORY_MAX_ENTRY_LENGTH,
	DEFAULT_EPISODIC_MEMORY_TOP_K,
	createEpisodicMemoryExtractFn,
	createEpisodicMemoryReflectFn,
} from '../runtime/episodic-memory-defaults';
import { InMemoryMemory } from '../runtime/memory-store';
import { createEmbeddingModel } from '../runtime/model-factory';
import {
	createObservationLogObserveFn,
	createObservationLogReflectFn,
	DEFAULT_OBSERVATION_LOG_LOCK_TTL_MS,
	DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS,
	DEFAULT_OBSERVATION_LOG_RENDER_TOKEN_BUDGET,
	DEFAULT_OBSERVATION_LOG_TAIL_LIMIT,
} from '../runtime/observation-log-defaults';
import { hasObservationLogStore } from '../runtime/observation-log-store';
import type {
	BuiltMemory,
	EpisodicMemoryConfig,
	MemoryConfig,
	ObservationalMemoryConfig,
	SemanticRecallConfig,
	TitleGenerationConfig,
} from '../types';
import type { ModelConfig } from '../types/sdk/agent';

const DEFAULT_LAST_MESSAGES = 10;

export { DEFAULT_OBSERVATION_LOG_LOCK_TTL_MS, DEFAULT_OBSERVATION_LOG_RENDER_TOKEN_BUDGET };

export interface ResolveObservationalMemoryConfigOptions {
	defaultModel: ModelConfig;
}

export type ResolveMemoryConfigDefaultsOptions = ResolveObservationalMemoryConfigOptions;

export function resolveObservationalMemoryConfig(
	config: ObservationalMemoryConfig,
	options: ResolveObservationalMemoryConfigOptions,
): ObservationalMemoryConfig {
	const observerModel = options.defaultModel;
	const reflectorModel = options.defaultModel;

	return {
		observerThresholdTokens:
			config.observerThresholdTokens ?? DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS,
		reflectorThresholdTokens:
			config.reflectorThresholdTokens ?? DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS,
		renderTokenBudget: config.renderTokenBudget ?? DEFAULT_OBSERVATION_LOG_RENDER_TOKEN_BUDGET,
		observationLogTailLimit: config.observationLogTailLimit ?? DEFAULT_OBSERVATION_LOG_TAIL_LIMIT,
		lockTtlMs: config.lockTtlMs ?? DEFAULT_OBSERVATION_LOG_LOCK_TTL_MS,
		observe: config.observe ?? createObservationLogObserveFn(observerModel),
		reflect: config.reflect ?? createObservationLogReflectFn(reflectorModel),
	};
}

export function resolveEpisodicMemoryConfig(
	config: EpisodicMemoryConfig,
	options: ResolveMemoryConfigDefaultsOptions,
): EpisodicMemoryConfig {
	const embeddingModel = config.embeddingModel ?? DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL;
	const extractorModel = options.defaultModel;
	const reflectorModel = options.defaultModel;

	return {
		enabled: config.enabled,
		topK: config.topK ?? DEFAULT_EPISODIC_MEMORY_TOP_K,
		halfLifeDays: config.halfLifeDays ?? DEFAULT_EPISODIC_MEMORY_HALF_LIFE_DAYS,
		maxEntriesPerRun: config.maxEntriesPerRun ?? DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
		maxEntryLength: config.maxEntryLength ?? DEFAULT_EPISODIC_MEMORY_MAX_ENTRY_LENGTH,
		sync: config.sync,
		embedder:
			config.embedder ?? createEmbeddingModel(embeddingModel, config.embeddingProviderOptions),
		embeddingModel,
		extract:
			config.extract ??
			createEpisodicMemoryExtractFn(extractorModel, {
				extractionPrompt: config.prompts?.extraction,
			}),
		reflect:
			config.reflect ??
			createEpisodicMemoryReflectFn(reflectorModel, {
				reflectionPrompt: config.prompts?.reflection,
			}),
		prompts: config.prompts,
	};
}

export function resolveMemoryConfigDefaults(
	config: MemoryConfig,
	options: ResolveMemoryConfigDefaultsOptions,
): MemoryConfig {
	const episodicMemory = isEpisodicMemoryEnabled(config.episodicMemory)
		? resolveEpisodicMemoryConfig(config.episodicMemory, options)
		: config.episodicMemory;

	if (!config.observationalMemory) {
		return normalizeMemoryConfig({
			...config,
			episodicMemory,
		});
	}

	if (!hasObservationLogStore(config.memory)) {
		throw new Error(
			"Observational memory requires a storage backend that implements BuiltObservationLogStore (e.g. n8n's N8nMemory).",
		);
	}

	const observationalMemory = resolveObservationalMemoryConfig(config.observationalMemory, options);

	return normalizeMemoryConfig({
		...config,
		memory: config.memory,
		observationalMemory,
		episodicMemory,
	});
}

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

/**
 * Builder for configuring conversation memory.
 *
 * Usage:
 * ```typescript
 * const memory = new Memory()
 *   .storage('memory')
 *   .lastMessages(20)
 *   .observationalMemory({ renderTokenBudget: 4500 });
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

		return normalizeMemoryConfig({
			...baseConfig,
			memory,
			observationalMemory: this.observationalMemoryConfig,
		});
	}
}
