import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';

import type { InstanceAiMemoryConfig } from '../types';
import { WORKING_MEMORY_TEMPLATE } from './working-memory-template';

/**
 * Creates a Mastra Memory instance with the appropriate storage backend.
 * - PostgreSQL: uses PostgresStore + PgVector (production)
 * - SQLite/file: uses LibSQLStore + LibSQLVector (development)
 */
export function createMemory(config: InstanceAiMemoryConfig): Memory {
	const isPostgres = config.postgresUrl.startsWith('postgresql://');

	const storage = isPostgres
		? new PostgresStore({
				id: 'instance-ai-storage',
				connectionString: config.postgresUrl,
			})
		: new LibSQLStore({
				id: 'instance-ai-storage',
				url: config.postgresUrl, // e.g. "file:./instance-ai-memory.db"
			});

	const TITLE_INSTRUCTIONS = [
		'Generate a concise title (max 60 chars) summarizing what the user wants.',
		'Return ONLY the title text. No quotes, colons, or explanation.',
		'Focus on the user intent, not what the assistant might reply.',
		'Examples: "Build Gmail to Slack workflow", "Debug failed execution", "Show project files"',
	].join('\n');

	const memoryOptions: ConstructorParameters<typeof Memory>[0] = {
		storage,
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

	// Semantic recall (long-term) — optional, requires an embedder model
	if (config.embedderModel && config.semanticRecallTopK !== 0) {
		memoryOptions.vector = isPostgres
			? new PgVector({
					id: 'instance-ai-vector',
					connectionString: config.postgresUrl,
				})
			: new LibSQLVector({
					id: 'instance-ai-vector',
					url: config.postgresUrl,
				});
		memoryOptions.options!.semanticRecall = {
			topK: config.semanticRecallTopK ?? 5,
			messageRange: { before: 2, after: 1 },
		};
	}

	return new Memory(memoryOptions);
}
