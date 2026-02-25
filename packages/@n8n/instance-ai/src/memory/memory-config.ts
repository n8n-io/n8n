import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';

import type { InstanceAiMemoryConfig } from '../types';
import { WORKING_MEMORY_TEMPLATE } from './working-memory-template';

export function createMemory(config: InstanceAiMemoryConfig): Memory {
	const storage = new PostgresStore({
		id: 'instance-ai-storage',
		connectionString: config.postgresUrl,
	});

	const memoryOptions: ConstructorParameters<typeof Memory>[0] = {
		storage,
		options: {
			lastMessages: config.lastMessages ?? 20,
			workingMemory: {
				enabled: true,
				template: WORKING_MEMORY_TEMPLATE,
			},
		},
	};

	// Semantic recall (long-term) — optional, requires an embedder model
	if (config.embedderModel && config.semanticRecallTopK !== 0) {
		memoryOptions.vector = new PgVector({
			id: 'instance-ai-vector',
			connectionString: config.postgresUrl,
		});
		memoryOptions.options!.semanticRecall = {
			topK: config.semanticRecallTopK ?? 5,
			messageRange: { before: 2, after: 1 },
		};
	}

	return new Memory(memoryOptions);
}
