import { Memory } from '@mastra/memory';

import type { InstanceAiMemoryConfig } from '../types';

/**
 * Creates a Mastra Memory instance backed by the TypeORM composite store.
 *
 * Semantic recall is enabled when both `embedderModel` and `semanticRecallTopK`
 * are configured. When absent, semantic recall stays disabled so behavior is
 * predictable in minimal deployments.
 */
export function createMemory(config: InstanceAiMemoryConfig): Memory {
	const memoryOptions: ConstructorParameters<typeof Memory>[0] = {
		storage: config.storage,
		options: {
			lastMessages: config.lastMessages ?? 20,
			generateTitle: false,
			workingMemory: {
				enabled: false,
			},
			semanticRecall: false,
		},
	};

	// Enable semantic recall when an embedder model is configured.
	// The embedder string is a "provider/model" ID (e.g. "openai/text-embedding-3-small")
	// that Mastra's model router resolves at runtime.
	if (config.embedderModel && config.semanticRecallTopK) {
		if (memoryOptions.options) {
			(memoryOptions.options as Record<string, unknown>).semanticRecall = {
				topK: config.semanticRecallTopK,
			};
		}
		(memoryOptions as Record<string, unknown>).embedder = config.embedderModel;
	}

	return new Memory(memoryOptions);
}
