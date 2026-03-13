import { Memory } from '@mastra/memory';

import type { InstanceAiMemoryConfig } from '../types';
import { WORKING_MEMORY_TEMPLATE } from './working-memory-template';

/**
 * Creates a Mastra Memory instance backed by the TypeORM composite store.
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
		},
	};

	// Mastra's MemoryConfig type requires DynamicArgument<MastraModelConfig> for model,
	// but at runtime it accepts a plain model ID string (e.g. "anthropic/claude-sonnet-4-5").
	// Override the generateTitle config after construction to inject custom title instructions.
	if (config.titleModel && memoryOptions.options) {
		(memoryOptions.options as Record<string, unknown>).generateTitle = {
			model: config.titleModel,
			instructions: TITLE_INSTRUCTIONS,
		};
	}

	return new Memory(memoryOptions);
}
