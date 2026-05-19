import { hasEpisodicMemoryStore, isEpisodicMemoryEnabled } from '../runtime/episodic-memory';
import {
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN,
	DEFAULT_EPISODIC_MEMORY_TOP_K,
	createEpisodicMemoryExtractFn,
	createEpisodicMemoryReflectFn,
} from '../runtime/episodic-memory-defaults';
import { InMemoryMemory } from '../runtime/memory-store';
import { createEmbeddingModel } from '../runtime/model-factory';import {
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
	}

	const observationalMemoryConfig =
		config.observationLog?.renderTokenBudget !== undefined &&
		config.observationalMemory.renderTokenBudget === undefined
			? {
					...config.observationalMemory,
					renderTokenBudget: config.observationLog.renderTokenBudget,
				}
			: config.observationalMemory;
	const observationalMemory = resolveObservationalMemoryConfig(observationalMemoryConfig, options);

	return normalizeMemoryConfig({
		...config,
		memory: config.memory,
		observationalMemory,
		episodicMemory,	});
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
