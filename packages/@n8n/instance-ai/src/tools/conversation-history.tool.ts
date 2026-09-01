import { Tool } from '@n8n/agents';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import {
	CONVERSATION_HISTORY_MAX_SEARCH_LIMIT,
	CONVERSATION_HISTORY_MAX_WINDOW_SIDE,
} from '../types';
import {
	conversationHistoryMessagesResultSchema,
	conversationHistorySearchResultSchema,
} from './conversation-history.schema';
import { DOMAIN_TOOL_IDS } from './tool-ids';

// ── Action schemas ──────────────────────────────────────────────────────────

const searchAction = z.object({
	action: z
		.literal('search')
		.describe('Find past conversations by text, or list the most recent ones.'),
	query: z
		.string()
		.min(2)
		.max(200)
		.optional()
		.describe(
			"Case-insensitive text matched against conversation titles, the user's messages, and answers the user gave to ask-user questions. Matched as one exact phrase — prefer fewer, short, distinctive terms, and run separate searches for separate concepts. Omit to list the most recent conversations instead.",
		),
	limit: z
		.number()
		.int()
		.positive()
		.max(CONVERSATION_HISTORY_MAX_SEARCH_LIMIT)
		.optional()
		.describe(
			`Max conversations to return (default 10 when searching, 5 when listing recent; max ${CONVERSATION_HISTORY_MAX_SEARCH_LIMIT}).`,
		),
});

const getMessagesAction = z.object({
	action: z.literal('get-messages').describe('Read messages from one past conversation.'),
	threadId: z.string().describe('Conversation id from a search result.'),
	aroundMessageId: z
		.string()
		.optional()
		.describe('Center the read on this message (id from a search excerpt).'),
	before: z
		.number()
		.int()
		.positive()
		.max(CONVERSATION_HISTORY_MAX_WINDOW_SIDE)
		.optional()
		.describe(
			`Messages before the anchor. Without aroundMessageId, the last N messages of the conversation (max ${CONVERSATION_HISTORY_MAX_WINDOW_SIDE}).`,
		),
	after: z
		.number()
		.int()
		.positive()
		.max(CONVERSATION_HISTORY_MAX_WINDOW_SIDE)
		.optional()
		.describe(
			`Messages after the anchor. Without aroundMessageId, the first N messages of the conversation (max ${CONVERSATION_HISTORY_MAX_WINDOW_SIDE}).`,
		),
});

const conversationHistoryRuntimeInputSchema = z
	.discriminatedUnion('action', [searchAction, getMessagesAction])
	.superRefine((value, ctx) => {
		if (
			value.action === 'get-messages' &&
			value.aroundMessageId === undefined &&
			value.before !== undefined &&
			value.after !== undefined
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'before and after can only be combined with aroundMessageId',
			});
		}
	});

const conversationHistoryToolInputSchema = sanitizeInputSchema(
	conversationHistoryRuntimeInputSchema,
);

type Input = z.infer<typeof conversationHistoryRuntimeInputSchema>;

// ── Output schemas ───────────────────────────────────────────────────────────
// Service result schemas (the types in `../types` are inferred from them),
// extended with the tool's soft-failure `error` field.

const searchOutputSchema = conversationHistorySearchResultSchema.extend({
	error: z.string().optional(),
});

const getMessagesOutputSchema = conversationHistoryMessagesResultSchema.extend({
	error: z.string().optional(),
});

const conversationHistoryOutputSchema = z.union([searchOutputSchema, getMessagesOutputSchema]);

// ── Handlers ──────────────────────────────────────────────────────────────

function requireConversationHistoryService(context: InstanceAiContext) {
	const { conversationHistoryService } = context;
	if (!conversationHistoryService) {
		throw new UserError('Conversation history is not available on this instance.');
	}
	return conversationHistoryService;
}

/** `UserError`s are written for the caller and pass through; anything else could
 *  carry driver/SQL detail — the model gets the fallback, the log the real error. */
function toSafeErrorMessage(context: InstanceAiContext, error: unknown, fallback: string): string {
	if (error instanceof UserError) return error.message;
	context.logger.warn('conversation-history tool call failed', {
		error: error instanceof Error ? error.message : String(error),
	});
	return fallback;
}

async function handleSearch(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'search' }>,
): Promise<z.infer<typeof searchOutputSchema>> {
	try {
		return await requireConversationHistoryService(context).search({
			query: input.query,
			limit: input.limit,
		});
	} catch (error) {
		return {
			hits: [],
			totalThreadsMatched: 0,
			error: toSafeErrorMessage(context, error, 'Failed to search conversation history.'),
		};
	}
}

async function handleGetMessages(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-messages' }>,
): Promise<z.infer<typeof getMessagesOutputSchema>> {
	try {
		return await requireConversationHistoryService(context).getMessages({
			threadId: input.threadId,
			aroundMessageId: input.aroundMessageId,
			before: input.before,
			after: input.after,
		});
	} catch (error) {
		return {
			threadId: input.threadId,
			title: '',
			messages: [],
			hasMoreBefore: false,
			hasMoreAfter: false,
			error: toSafeErrorMessage(context, error, 'Failed to read the conversation.'),
		};
	}
}

// ── Tool factory ─────────────────────────────────────────────────────────────

const DESCRIPTION =
	"Recall the user's past conversations in this project (the current conversation is excluded) — stated preferences, earlier requirements, prior work. `search` finds conversations by text, or lists the most recent ones when given no query; `get-messages` then reads a message window from one of them. Read-only.";

export function createConversationHistoryTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.CONVERSATION_HISTORY)
		.description(DESCRIPTION)
		.input(conversationHistoryToolInputSchema)
		.output(conversationHistoryOutputSchema)
		.handler(async (input) => {
			const parsed = conversationHistoryRuntimeInputSchema.parse(input);
			if (parsed.action === 'search') return await handleSearch(context, parsed);
			return await handleGetMessages(context, parsed);
		})
		.build();
}
