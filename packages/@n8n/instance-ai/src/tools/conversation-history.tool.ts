/**
 * Consolidated conversation-history tool — search past conversations, then
 * read a message window from one of them. Read-only, no HITL.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import {
	CONVERSATION_HISTORY_MAX_SEARCH_LIMIT,
	CONVERSATION_HISTORY_MAX_WINDOW_SIDE,
} from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/**
 * The tool is only registered when the service is wired (see `tools/index.ts`),
 * so this can only throw if that gate and the handler ever disagree. The
 * per-action catch turns it into the soft `{ error }` shape.
 */
function requireConversationHistoryService(context: InstanceAiContext) {
	const { conversationHistoryService } = context;
	if (!conversationHistoryService) {
		throw new Error('Conversation history is not available on this instance.');
	}
	return conversationHistoryService;
}

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

/**
 * `z.discriminatedUnion` members must be plain ZodObjects, so the
 * before/after + aroundMessageId cross-field rule can't live on
 * `getMessagesAction` itself (`.superRefine()` would turn it into a
 * ZodEffects and break the union's type). Apply it to the assembled union
 * instead — same two-schema split neighboring tools use (see
 * `mcpServersRuntimeInputSchema` / `mcpServersToolInputSchema` in
 * `mcp-servers.tool.ts`): this "runtime" schema keeps the refinement and is
 * `.parse()`d by hand in the handler, while `sanitizeInputSchema` flattens a
 * *copy* into the loose, top-level-object schema Anthropic requires for
 * `.input()`.
 */
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

const searchExcerptSchema = z.object({
	messageId: z.string(),
	text: z.string(),
	createdAt: z.string(),
});

const searchHitSchema = z.object({
	threadId: z.string(),
	title: z.string(),
	updatedAt: z.string(),
	matchedIn: z.array(z.enum(['title', 'messages', 'user-answers'])),
	firstMessageExcerpt: z.string().optional(),
	excerpts: z.array(searchExcerptSchema),
	totalMatches: z.number(),
});

const searchOutputSchema = z.object({
	hits: z.array(searchHitSchema),
	totalThreadsMatched: z.number(),
	error: z.string().optional(),
});

const conversationHistoryMessageSchema = z.object({
	messageId: z.string(),
	role: z.enum(['user', 'assistant']),
	createdAt: z.string(),
	text: z.string(),
	userAnswers: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

const getMessagesOutputSchema = z.object({
	threadId: z.string(),
	title: z.string(),
	messages: z.array(conversationHistoryMessageSchema),
	hasMoreBefore: z.boolean(),
	hasMoreAfter: z.boolean(),
	error: z.string().optional(),
});

const conversationHistoryOutputSchema = z.union([searchOutputSchema, getMessagesOutputSchema]);

// ── Handlers ──────────────────────────────────────────────────────────────

async function handleSearch(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'search' }>,
): Promise<z.infer<typeof searchOutputSchema>> {
	try {
		// Defaults (10 searching, 5 listing) are applied by the service — the
		// tool passes the raw input through unchanged, same as get-messages.
		return await requireConversationHistoryService(context).search({
			query: input.query,
			limit: input.limit,
		});
	} catch (error) {
		return {
			hits: [],
			totalThreadsMatched: 0,
			error: error instanceof Error ? error.message : 'Failed to search conversation history.',
		};
	}
}

async function handleGetMessages(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-messages' }>,
): Promise<z.infer<typeof getMessagesOutputSchema>> {
	try {
		// Defaults (tail/head/around window sizing) are applied by the service —
		// the tool passes the raw input through unchanged.
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
			error: error instanceof Error ? error.message : 'Failed to read the conversation.',
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
