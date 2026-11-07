import { z } from 'zod';

import { messageToText } from './message-text';
import { getCreatedAt } from '../../sdk/message';
import { Tool } from '../../sdk/tool';
import type { BuiltMemory } from '../../types';
import type { AgentPersistenceOptions } from '../../types/sdk/agent';

export const READ_HISTORY_TOOL_NAME = 'read_history';

const MAX_RESULTS = 50;
const DEFAULT_RESULTS = 10;
const MAX_TEXT_CHARS = 4_000;

const ReadHistoryInputSchema = z.object({
	query: z
		.string()
		.optional()
		.describe('Case-insensitive text to find. Omit to read the latest messages.'),
	before: z
		.string()
		.optional()
		.describe('ISO timestamp. Return only messages created before it, to page back.'),
	limit: z.number().int().min(1).max(MAX_RESULTS).optional(),
});

const ReadHistoryOutputSchema = z.object({
	messages: z.array(
		z.object({
			id: z.string(),
			role: z.string(),
			createdAt: z.string().optional(),
			text: z.string(),
			truncated: z.boolean(),
		}),
	),
});

type ReadHistoryOutput = z.infer<typeof ReadHistoryOutputSchema>;

const INSTRUCTION =
	'Earlier parts of this conversation can be replaced by an observation log. When you need an exact detail the log left out (an id, a value, a tool result), call read_history instead of guessing.';

/** Read the stored thread, including messages the observation log replaced. */
export function createReadHistoryTool(opts: {
	memory: BuiltMemory;
	persistence: AgentPersistenceOptions;
}) {
	return new Tool(READ_HISTORY_TOOL_NAME)
		.description(
			'Read earlier messages of this conversation, including ones replaced by the observation log. Search by text or page back by time.',
		)
		.systemInstruction(INSTRUCTION)
		.input(ReadHistoryInputSchema)
		.output(ReadHistoryOutputSchema)
		.handler(async ({ query, before, limit }): Promise<ReadHistoryOutput> => {
			const beforeDate = before ? new Date(before) : undefined;
			const all = await opts.memory.getMessages(opts.persistence.threadId, {
				resourceId: opts.persistence.resourceId,
				...(beforeDate && !isNaN(beforeDate.getTime()) ? { before: beforeDate } : {}),
			});
			const needle = query?.trim().toLowerCase();
			const matches: ReadHistoryOutput['messages'] = [];
			const max = limit ?? DEFAULT_RESULTS;
			// Newest first, so the agent sees the most relevant context before paging.
			for (let i = all.length - 1; i >= 0 && matches.length < max; i--) {
				const message = all[i];
				const text = messageToText(message);
				if (!text || (needle && !text.toLowerCase().includes(needle))) continue;
				matches.push({
					id: message.id,
					role: 'role' in message ? message.role : 'custom',
					createdAt: getCreatedAt(message)?.toISOString(),
					text: text.slice(0, MAX_TEXT_CHARS),
					truncated: text.length > MAX_TEXT_CHARS,
				});
			}
			return { messages: matches.reverse() };
		})
		.build();
}
