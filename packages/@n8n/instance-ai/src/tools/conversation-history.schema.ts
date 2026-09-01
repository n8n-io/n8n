import { z } from 'zod';

// Canonical shapes for conversation-history results. The service types in
// `../types` are inferred from these schemas, and the tool's output schemas
// extend them — one definition, so the tool contract and the host service
// interface cannot drift.

/** Where a conversation-history search hit matched. */
export const conversationHistoryMatchSourceSchema = z.enum(['title', 'messages', 'user-answers']);

export const conversationHistoryExcerptSchema = z.object({
	/** Anchor for a follow-up get-messages read. */
	messageId: z.string(),
	text: z.string(),
	createdAt: z.string(),
});

export const conversationHistorySearchHitSchema = z.object({
	threadId: z.string(),
	title: z.string(),
	updatedAt: z.string(),
	matchedIn: z.array(conversationHistoryMatchSourceSchema),
	/** Opening user message of the conversation — the original ask. */
	firstMessageExcerpt: z.string().optional(),
	excerpts: z.array(conversationHistoryExcerptSchema),
	/** Matching message rows in the thread (0 for title-only hits). */
	totalMatches: z.number(),
});

export const conversationHistorySearchResultSchema = z.object({
	hits: z.array(conversationHistorySearchHitSchema),
	/** Threads matched before the limit was applied. Approximate: counted at the
	 *  SQL prefilter, so it can include threads the excerpt re-check would drop. */
	totalThreadsMatched: z.number(),
});

export const conversationHistoryMessageSchema = z.object({
	messageId: z.string(),
	role: z.enum(['user', 'assistant']),
	createdAt: z.string(),
	/** Text blocks of the message, truncated. */
	text: z.string(),
	/** Resolved ask-user Q&A pairs carried by this (assistant) message, if any. */
	userAnswers: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

export const conversationHistoryMessagesResultSchema = z.object({
	threadId: z.string(),
	title: z.string(),
	/** Oldest-first. */
	messages: z.array(conversationHistoryMessageSchema),
	hasMoreBefore: z.boolean(),
	hasMoreAfter: z.boolean(),
});
