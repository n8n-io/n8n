/**
 * Session Chat Handler
 *
 * Wraps agent chat with session management. Handles loading, compacting,
 * and saving sessions, as well as filtering internal messages.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';

import type { SessionMessagesChunk, StreamChunk, StreamOutput } from '../../types/streaming';
import type { ChatPayload } from '../../workflow-builder-agent';
import type { HistoryContext } from '../prompts';
import type { ConversationEntry } from '../utils/code-builder-session';
import {
	loadCodeBuilderSession,
	saveCodeBuilderSession,
	compactSessionIfNeeded,
	generateCodeBuilderThreadId,
	saveSessionMessages,
} from '../utils/code-builder-session';

/** Type guard for SessionMessagesChunk */
function isSessionMessagesChunk(chunk: StreamChunk): chunk is SessionMessagesChunk {
	return chunk.type === 'session-messages' && 'messages' in chunk;
}

/**
 * Agent chat function type
 */
type AgentChatFn = (
	payload: ChatPayload,
	userId: string,
	abortSignal?: AbortSignal,
	historyContext?: HistoryContext,
) => AsyncGenerator<StreamOutput, void, unknown>;

/**
 * Configuration for SessionChatHandler
 */
export interface SessionChatHandlerConfig {
	checkpointer: MemorySaver;
	llm: BaseChatModel;
	logger?: Logger;
	/**
	 * Callback when generation completes successfully (not aborted).
	 * Used for credit deduction and UI updates.
	 */
	onGenerationSuccess?: () => Promise<void>;
}

/**
 * Parameters for executing session-wrapped chat
 */
export interface SessionChatParams {
	payload: ChatPayload;
	userId: string;
	abortSignal?: AbortSignal;
	agentChat: AgentChatFn;
}

/**
 * Handles session management for agent chat.
 *
 * This handler:
 * 1. Loads existing session from checkpointer
 * 2. Compacts session if needed (when messages exceed threshold)
 * 3. Builds history context for the agent
 * 4. Delegates to the agent with history context
 * 5. Filters internal messages (session-messages) from output
 * 6. Saves session after successful generation
 */
export class SessionChatHandler {
	private checkpointer: MemorySaver;
	private llm: BaseChatModel;
	private logger?: Logger;
	private onGenerationSuccess?: () => Promise<void>;

	constructor(config: SessionChatHandlerConfig) {
		this.checkpointer = config.checkpointer;
		this.llm = config.llm;
		this.logger = config.logger;
		this.onGenerationSuccess = config.onGenerationSuccess;
	}

	/**
	 * Build history context from session if available.
	 */
	private buildHistoryContext(session: {
		conversationEntries: ConversationEntry[];
		previousSummary?: string;
	}): HistoryContext | undefined {
		if (session.conversationEntries.length > 0 || session.previousSummary) {
			return {
				conversationEntries: session.conversationEntries,
				previousSummary: session.previousSummary,
			};
		}
		return undefined;
	}

	/**
	 * Process a chunk from the agent, tracking generation success and session messages.
	 */
	private processChunk(chunk: StreamOutput): {
		generationSucceeded: boolean;
		sessionMessages: unknown[] | undefined;
		filteredMessages: StreamOutput['messages'];
	} {
		let generationSucceeded = false;
		let sessionMessages: unknown[] | undefined;

		if (chunk.messages?.some((msg) => msg.type === 'workflow-updated')) {
			generationSucceeded = true;
		}

		for (const msg of chunk.messages ?? []) {
			if (isSessionMessagesChunk(msg)) {
				sessionMessages = msg.messages;
			}
		}

		const filteredMessages = chunk.messages?.filter((msg) => msg.type !== 'session-messages');

		return { generationSucceeded, sessionMessages, filteredMessages };
	}

	/**
	 * Execute session-wrapped chat.
	 *
	 * @param params - Chat parameters including agent function
	 * @yields StreamOutput chunks with internal messages filtered
	 */
	async *execute(params: SessionChatParams): AsyncGenerator<StreamOutput, void, unknown> {
		const { payload, userId, abortSignal, agentChat } = params;

		// Extract workflow ID from context
		const workflowId = payload.workflowContext?.currentWorkflow?.id;

		if (!workflowId) {
			// No workflow ID - cannot manage session, delegate directly
			this.logger?.debug('No workflow ID, skipping session management');
			yield* agentChat(payload, userId, abortSignal);
			return;
		}

		const threadId = generateCodeBuilderThreadId(workflowId, userId);

		// Load existing session
		let session = await loadCodeBuilderSession(this.checkpointer, threadId);

		this.logger?.debug('Loaded CodeBuilder session', {
			threadId,
			conversationEntriesCount: session.conversationEntries.length,
			hasPreviousSummary: !!session.previousSummary,
		});

		// Compact if needed
		session = await compactSessionIfNeeded(session, this.llm);
		const historyContext = this.buildHistoryContext(session);

		// Track generation success and capture session messages
		let generationSucceeded = false;
		let sessionMessages: unknown[] | undefined;

		// Delegate to agent with history context
		for await (const chunk of agentChat(payload, userId, abortSignal, historyContext)) {
			const result = this.processChunk(chunk);
			if (result.generationSucceeded) generationSucceeded = true;
			if (result.sessionMessages) sessionMessages = result.sessionMessages;

			if (result.filteredMessages && result.filteredMessages.length > 0) {
				yield { messages: result.filteredMessages };
			}
		}

		// Save current message to session
		session.conversationEntries.push({ type: 'build-request', message: payload.message });
		await saveCodeBuilderSession(this.checkpointer, threadId, session);

		// Save full message history for frontend retrieval
		if (generationSucceeded && sessionMessages) {
			await saveSessionMessages(
				this.checkpointer,
				workflowId,
				userId,
				sessionMessages,
				payload.versionId,
				payload.id,
			);

			this.logger?.debug('Saved session messages to SessionManager thread', {
				workflowId,
				userId,
				messageCount: sessionMessages.length,
			});
		}

		if (generationSucceeded && this.onGenerationSuccess) {
			try {
				await this.onGenerationSuccess();
			} catch (error) {
				this.logger?.warn('Failed to execute onGenerationSuccess callback', { error });
			}
		}

		this.logger?.debug('Saved CodeBuilder session', {
			threadId,
			newEntryCount: session.conversationEntries.length,
		});
	}
}
