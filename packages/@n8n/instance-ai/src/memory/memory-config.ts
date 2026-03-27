import { Memory } from '@mastra/memory';

import type { InstanceAiMemoryConfig } from '../types';
import { WORKING_MEMORY_TEMPLATE } from './working-memory-template';

/**
 * Creates a Mastra Memory instance backed by the TypeORM composite store.
 *
 * Semantic recall is enabled when both `embedderModel` and `semanticRecallTopK`
 * are configured. When absent, semantic recall stays disabled so behavior is
 * predictable in minimal deployments.
 */
export function createMemory(config: InstanceAiMemoryConfig): Memory {
	const TITLE_INSTRUCTIONS = [
		'Generate a concise title (max 60 chars) summarizing what the user wants.',
		'Return ONLY the title text. No quotes, colons, or explanation.',
		'Focus on the user intent, not what the assistant might reply.',
		'Examples: "Build Gmail to Slack workflow", "Debug failed execution", "Show project files"',
	].join('\n');

	const memoryOptions: ConstructorParameters<typeof Memory>[0] = {
		storage: config.storage,
		options: {
			lastMessages: config.lastMessages ?? 20,
			generateTitle: true,
			workingMemory: {
				enabled: true,
				template: WORKING_MEMORY_TEMPLATE,
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

	// Override the generateTitle config to inject custom title instructions.
	// The model can be a string ID (e.g. "anthropic/claude-sonnet-4-5") resolved by Mastra's
	// model router, or a pre-built LanguageModelV2 instance (used when routing through a proxy
	// that requires the native Anthropic provider instead of OpenAI-compatible).
	if (config.titleModel && memoryOptions.options) {
		(memoryOptions.options as Record<string, unknown>).generateTitle = {
			model: config.titleModel,
			instructions: TITLE_INSTRUCTIONS,
		};
	}

	return new Memory(memoryOptions);
}
