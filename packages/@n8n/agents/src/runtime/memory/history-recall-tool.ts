import { z } from 'zod';

import { messageToText } from './message-text';
import { getCreatedAt } from '../../sdk/message';
import { Tool } from '../../sdk/tool';
import type { BuiltMemory } from '../../types';
import type { AgentPersistenceOptions } from '../../types/sdk/agent';
import type { AgentDbMessage } from '../../types/sdk/message';

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
	beforeId: z
		.string()
		.optional()
		.describe(
			"Id of the oldest message you already have. Pass it with `before` (that message's createdAt) so messages with the same timestamp are not skipped.",
		),
	limit: z.number().int().min(1).max(MAX_RESULTS).optional(),
});

const ReadHistoryOutputSchema = z.object({
	messages: z.array(
		z.object({
			id: z.string(),
			role: z.string(),
			createdAt: z.string().optional(),
			text: z.string(),
			/** Character position in the message where `text` starts. */
			offset: z.number(),
			truncated: z.boolean(),
		}),
	),
});

type ReadHistoryOutput = z.infer<typeof ReadHistoryOutputSchema>;

/**
 * Cut long messages to MAX_TEXT_CHARS. For a search hit, centre the excerpt on
 * the match: a match deep inside a long message must not be cut off.
 */
export function excerpt(text: string, needle?: string) {
	if (text.length <= MAX_TEXT_CHARS) return { text, offset: 0, truncated: false };
	const at = needle ? indexOfIgnoreCase(text, needle) : -1;
	const offset =
		at < 0 ? 0 : Math.max(0, Math.min(at - MAX_TEXT_CHARS / 2, text.length - MAX_TEXT_CHARS));
	return { text: text.slice(offset, offset + MAX_TEXT_CHARS), offset, truncated: true };
}

/**
 * Index of `needle` (already lowercased) in the original `text`. Lowercasing can
 * change the string length (e.g. 'İ'), so an index into the folded string is
 * not always an index into `text`.
 */
export function indexOfIgnoreCase(text: string, needle: string): number {
	const folded = text.toLowerCase();
	if (folded.length === text.length) return folded.indexOf(needle);
	// Fold one code point at a time and map each folded position back to its
	// original position, so the search stays linear in the text length.
	let mapped = '';
	const origin: number[] = [];
	let i = 0;
	for (const char of text) {
		const lower = char.toLowerCase();
		mapped += lower;
		for (let k = 0; k < lower.length; k++) origin.push(i);
		i += char.length;
	}
	const at = mapped.indexOf(needle);
	return at < 0 ? -1 : origin[at];
}

/**
 * Keep messages older than the `(createdAt, id)` cursor. Messages that share
 * the cursor timestamp keep storage order, so drop the cursor message and
 * every message after it. Without the cursor message, fall back to `< before`.
 */
function cutAtCursor(messages: AgentDbMessage[], before: Date, beforeId: string): AgentDbMessage[] {
	const cursorAt = messages.findIndex((message) => message.id === beforeId);
	if (cursorAt >= 0) return messages.slice(0, cursorAt);
	const limit = before.getTime();
	return messages.filter((message) => {
		const createdAt = getCreatedAt(message)?.getTime();
		return createdAt === undefined || createdAt < limit;
	});
}

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
		.handler(async ({ query, before, beforeId, limit }): Promise<ReadHistoryOutput> => {
			const beforeDate = before ? new Date(before) : undefined;
			if (beforeDate && isNaN(beforeDate.getTime())) {
				throw new Error(`read_history: "before" is not a valid ISO timestamp: ${before}`);
			}
			const needle = query?.trim().toLowerCase() || undefined;
			const max = limit ?? DEFAULT_RESULTS;
			// Storage filters on `createdAt < before` only. With `beforeId`, load up to
			// and including the cursor timestamp, then cut at the cursor message so
			// older messages with the same timestamp are kept.
			const cursor = beforeDate && beforeId ? { before: beforeDate, id: beforeId } : undefined;
			const loadBefore = cursor ? new Date(cursor.before.getTime() + 1) : beforeDate;
			// Without a query or id cursor only the latest `max` messages are returned,
			// so load only those. Empty messages (no model-facing text) can make the result shorter than `max`.
			const loaded = await opts.memory.getMessages(opts.persistence.threadId, {
				resourceId: opts.persistence.resourceId,
				...(loadBefore ? { before: loadBefore } : {}),
				...(needle || cursor ? {} : { limit: max }),
			});
			const all = cursor ? cutAtCursor(loaded, cursor.before, cursor.id) : loaded;
			const matches: ReadHistoryOutput['messages'] = [];
			// Newest first, so the agent sees the most relevant context before paging.
			for (let i = all.length - 1; i >= 0 && matches.length < max; i--) {
				const message = all[i];
				const text = messageToText(message);
				if (!text || (needle && !text.toLowerCase().includes(needle))) continue;
				matches.push({
					id: message.id,
					role: 'role' in message ? message.role : 'custom',
					createdAt: getCreatedAt(message)?.toISOString(),
					...excerpt(text, needle),
				});
			}
			return { messages: matches.reverse() };
		})
		.build();
}
