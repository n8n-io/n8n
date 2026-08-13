/**
 * Code Builder Session Management
 *
 * Provides session persistence for the CodeBuilderAgent, enabling multi-turn
 * conversations where users can make incremental refinement requests like
 * "change the trigger to Slack" without re-explaining the whole workflow.
 *
 * Key design decisions:
 * - Stores user messages only (no AI responses or generated code)
 * - Uses MemorySaver for in-memory persistence
 * - Compacts oldest messages when count exceeds threshold
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { MemorySaver, Checkpoint } from '@langchain/langgraph';

import { conversationCompactChain } from '../../chains/conversation-compact';
import { generateThreadId } from '../../utils/thread-id';

/** Maximum number of conversation entries to retain before compaction */
const MAX_USER_MESSAGES = 20;

/** Number of oldest entries to compact when threshold is exceeded */
const MESSAGES_TO_COMPACT = 10;

/**
 * Typed conversation entry — discriminated union for different interaction types.
 */
export type ConversationEntry =
	| { type: 'build-request'; message: string }
	| { type: 'assistant-exchange'; userQuery: string; assistantSummary: string }
	| { type: 'plan'; userQuery: string; plan: string };

/**
 * Convert a ConversationEntry to a human-readable string.
 * Reused by compaction and prompt rendering.
 */
export function entryToString(entry: ConversationEntry): string {
	switch (entry.type) {
		case 'build-request':
			return entry.message;
		case 'assistant-exchange':
			return `[Help] Q: ${entry.userQuery} → A: ${entry.assistantSummary}`;
		case 'plan':
			return `[Plan] Q: ${entry.userQuery} → ${entry.plan}`;
	}
}

/**
 * Session state for the CodeBuilder
 */
export interface CodeBuilderSession {
	/** Typed conversation entries (most recent conversation history) */
	conversationEntries: ConversationEntry[];
	/** Compacted summary of older conversations (if any compaction has occurred) */
	previousSummary?: string;
	/** SDK session ID for continuing assistant conversations */
	sdkSessionId?: string;
}

/**
 * Internal checkpoint structure for session storage.
 * Accepts both new (conversationEntries) and legacy (userMessages) formats.
 */
interface SessionCheckpoint {
	conversationEntries?: ConversationEntry[];
	sdkSessionId?: string;
	/** @deprecated Legacy format — migrated on load */
	userMessages?: string[];
	previousSummary?: string;
}

function isSessionCheckpoint(value: unknown): value is SessionCheckpoint {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as SessionCheckpoint;
	// New format
	if ('conversationEntries' in obj && Array.isArray(obj.conversationEntries)) return true;
	// Legacy format
	if ('userMessages' in obj && Array.isArray(obj.userMessages)) return true;
	return false;
}

/**
 * Load a CodeBuilder session from the checkpointer
 *
 * @param checkpointer - MemorySaver instance for persistence
 * @param threadId - Unique thread identifier
 * @returns Session data with userMessages and optional previousSummary
 */
export async function loadCodeBuilderSession(
	checkpointer: MemorySaver,
	threadId: string,
): Promise<CodeBuilderSession> {
	const config: RunnableConfig = {
		configurable: {
			thread_id: threadId,
		},
	};

	try {
		const checkpointTuple = await checkpointer.getTuple(config);

		if (!checkpointTuple?.checkpoint) {
			return { conversationEntries: [] };
		}

		const channelValues = checkpointTuple.checkpoint.channel_values;
		const sessionData = channelValues?.codeBuilderSession;

		if (isSessionCheckpoint(sessionData)) {
			// New format
			if (sessionData.conversationEntries) {
				return {
					conversationEntries: sessionData.conversationEntries,
					previousSummary: sessionData.previousSummary,
					sdkSessionId: sessionData.sdkSessionId,
				};
			}
			// Legacy format — migrate each string to build-request
			if (sessionData.userMessages) {
				return {
					conversationEntries: sessionData.userMessages.map((msg) => ({
						type: 'build-request' as const,
						message: msg,
					})),
					previousSummary: sessionData.previousSummary,
				};
			}
		}

		return { conversationEntries: [] };
	} catch {
		// Thread doesn't exist yet or error reading
		return { conversationEntries: [] };
	}
}

/**
 * Save a CodeBuilder session to the checkpointer
 *
 * @param checkpointer - MemorySaver instance for persistence
 * @param threadId - Unique thread identifier
 * @param session - Session data to persist
 */
export async function saveCodeBuilderSession(
	checkpointer: MemorySaver,
	threadId: string,
	session: CodeBuilderSession,
): Promise<void> {
	const config: RunnableConfig = {
		configurable: {
			thread_id: threadId,
		},
	};

	// Get existing checkpoint tuple or create a new base
	const existingTuple = await checkpointer.getTuple(config).catch(() => undefined);
	const existingCheckpoint = existingTuple?.checkpoint;

	const sessionPayload: SessionCheckpoint = {
		conversationEntries: session.conversationEntries,
		previousSummary: session.previousSummary,
		sdkSessionId: session.sdkSessionId,
	};

	// Create checkpoint with session data, preserving existing checkpoint properties
	const checkpoint: Checkpoint = existingCheckpoint
		? {
				...existingCheckpoint,
				ts: new Date().toISOString(),
				channel_values: {
					...existingCheckpoint.channel_values,
					codeBuilderSession: sessionPayload,
				},
			}
		: {
				v: 1,
				id: crypto.randomUUID(),
				ts: new Date().toISOString(),
				channel_values: {
					codeBuilderSession: sessionPayload,
				},
				channel_versions: {},
				versions_seen: {},
			};

	const metadata = existingTuple?.metadata ?? {
		source: 'update' as const,
		step: -1,
		parents: {},
	};

	await checkpointer.put(config, checkpoint, metadata);
}

/**
 * Compact session if the number of conversation entries exceeds the threshold
 *
 * When conversationEntries.length > MAX_USER_MESSAGES:
 * 1. Takes the oldest MESSAGES_TO_COMPACT entries
 * 2. Summarizes them using conversationCompactChain
 * 3. Appends the summary to previousSummary
 * 4. Keeps only the most recent entries
 *
 * @param session - Current session state
 * @param llm - Language model for generating summaries
 * @param maxMessages - Maximum entries before compaction (default: 20)
 * @returns Updated session (may be unchanged if no compaction needed)
 */
export async function compactSessionIfNeeded(
	session: CodeBuilderSession,
	llm: BaseChatModel,
	maxMessages: number = MAX_USER_MESSAGES,
): Promise<CodeBuilderSession> {
	if (session.conversationEntries.length <= maxMessages) {
		return session;
	}

	const oldEntries = session.conversationEntries.slice(0, MESSAGES_TO_COMPACT);
	const recentEntries = session.conversationEntries.slice(MESSAGES_TO_COMPACT);

	// Convert to HumanMessage format for the compact chain
	const messages = oldEntries.map((entry) => new HumanMessage(entryToString(entry)));

	// Run compaction with existing summary
	const result = await conversationCompactChain(llm, messages, session.previousSummary ?? '');

	// Combine existing summary with new compaction
	let newSummary: string;
	if (session.previousSummary) {
		newSummary = `${session.previousSummary}\n\n---\n\n${result.summaryPlain}`;
	} else {
		newSummary = result.summaryPlain;
	}

	return {
		conversationEntries: recentEntries,
		previousSummary: newSummary,
		sdkSessionId: session.sdkSessionId,
	};
}

/**
 * Generate a thread ID for CodeBuilder sessions
 *
 * Uses a consistent format combining workflow ID and user ID to ensure
 * one session per workflow per user.
 *
 * @param workflowId - The workflow ID (from payload.id)
 * @param userId - The user ID
 * @returns A unique thread identifier
 */
export function generateCodeBuilderThreadId(workflowId: string, userId: string): string {
	return `code-builder-${workflowId}-${userId}`;
}

/**
 * Save raw LangChain messages to the SessionManager thread format
 *
 * This enables the frontend to retrieve conversation history via getSessions(),
 * which reads from the `workflow-{workflowId}-user-{userId}` thread format.
 *
 * The messages array should contain the full conversation history including
 * HumanMessage, AIMessage (with tool_calls), and ToolMessage objects.
 *
 * @param checkpointer - MemorySaver instance for persistence
 * @param workflowId - The workflow ID
 * @param userId - The user ID
 * @param messages - Raw LangChain messages from the agent
 * @param versionId - Optional version ID for revert functionality
 */
export async function saveSessionMessages(
	checkpointer: MemorySaver,
	workflowId: string,
	userId: string,
	messages: unknown[],
	versionId?: string,
	userMessageId?: string,
): Promise<void> {
	const threadId = generateThreadId(workflowId, userId, 'code-builder');

	const config: RunnableConfig = {
		configurable: {
			thread_id: threadId,
		},
	};

	// Get existing checkpoint or create new base
	const existingTuple = await checkpointer.getTuple(config).catch(() => undefined);
	const existingCheckpoint = existingTuple?.checkpoint;

	// Get existing messages array or start fresh
	const existingMessages: unknown[] =
		(existingCheckpoint?.channel_values?.messages as unknown[]) ?? [];

	// Use frontend's messageId if provided, otherwise generate a new one (for truncation support)
	const messageId = userMessageId ?? crypto.randomUUID();

	// Find the index of the first HumanMessage in the batch
	// (may not be at index 0 if SystemMessage comes first, e.g., in code-builder)
	const firstHumanMessageIndex = messages.findIndex((msg) => msg instanceof HumanMessage);

	// Add metadata to the first HumanMessage for truncation/restore support
	const messagesWithMetadata = messages.map((msg, index) => {
		if (index === firstHumanMessageIndex && msg instanceof HumanMessage) {
			return new HumanMessage({
				content: msg.content,
				additional_kwargs: {
					...msg.additional_kwargs,
					messageId,
					...(versionId && { versionId }),
				},
			});
		}
		return msg;
	});

	// Combine existing messages with new messages
	const allMessages = [...existingMessages, ...messagesWithMetadata];

	// Create checkpoint with updated messages
	const checkpoint: Checkpoint = existingCheckpoint
		? {
				...existingCheckpoint,
				ts: new Date().toISOString(),
				channel_values: {
					...existingCheckpoint.channel_values,
					messages: allMessages,
				},
			}
		: {
				v: 1,
				id: crypto.randomUUID(),
				ts: new Date().toISOString(),
				channel_values: {
					messages: allMessages,
				},
				channel_versions: {},
				versions_seen: {},
			};

	const metadata = existingTuple?.metadata ?? {
		source: 'update' as const,
		step: -1,
		parents: {},
	};

	await checkpointer.put(config, checkpoint, metadata);
}
