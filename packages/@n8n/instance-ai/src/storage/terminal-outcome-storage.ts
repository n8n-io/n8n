import type { Memory } from '@mastra/memory';
import { z } from 'zod';

import { patchThread } from './thread-patch';

const METADATA_KEY = 'instanceAiTerminalOutcomes';

const terminalOutcomeStatusSchema = z.enum(['completed', 'failed', 'cancelled']);

const terminalOutcomeSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	runId: z.string(),
	messageGroupId: z.string().optional(),
	correlationId: z.string().optional(),
	taskId: z.string(),
	agentId: z.string(),
	status: terminalOutcomeStatusSchema,
	userFacingMessage: z.string(),
	createdAt: z.string(),
	deliveredAt: z.string().optional(),
});

export type TerminalOutcome = z.infer<typeof terminalOutcomeSchema>;

export class TerminalOutcomeStorage {
	constructor(private readonly memory: Memory) {}

	async upsert(threadId: string, outcome: TerminalOutcome): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const current = parseOutcomes(metadata[METADATA_KEY]);
				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: {
							...current,
							[outcome.id]: outcome,
						},
					},
				};
			},
		});
	}

	async markDelivered(threadId: string, outcomeId: string, deliveredAt: string): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const current = parseOutcomes(metadata[METADATA_KEY]);
				const outcome = current[outcomeId];
				if (!outcome) return null;

				return {
					metadata: {
						...metadata,
						[METADATA_KEY]: {
							...current,
							[outcomeId]: {
								...outcome,
								deliveredAt,
							},
						},
					},
				};
			},
		});
	}

	async getUndelivered(threadId: string): Promise<TerminalOutcome[]> {
		const thread = await this.memory.getThreadById({ threadId });
		const outcomes = parseOutcomes(thread?.metadata?.[METADATA_KEY]);
		return Object.values(outcomes).filter((outcome) => !outcome.deliveredAt);
	}
}

function parseOutcomes(raw: unknown): Record<string, TerminalOutcome> {
	if (!raw || typeof raw !== 'object') return {};
	const outcomes: Record<string, TerminalOutcome> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		const parsed = terminalOutcomeSchema.safeParse(value);
		if (parsed.success) outcomes[key] = parsed.data;
	}
	return outcomes;
}
