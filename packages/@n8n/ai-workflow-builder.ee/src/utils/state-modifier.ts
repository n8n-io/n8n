import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, RemoveMessage } from '@langchain/core/messages';
import type { Logger } from '@n8n/backend-common';

import { cleanupDanglingToolCallMessages } from './cleanup-dangling-tool-call-messages';
import { estimateTokenCountFromMessages } from './token-usage';
import { conversationCompactChain } from '../chains/conversation-compact';
import { workflowNameChain } from '../chains/workflow-name';
import type { CoordinationLogEntry } from '../types/coordination';
import { createStateManagementMetadata } from '../types/coordination';
import type { SimpleWorkflow } from '../types/workflow';

export type StateModificationAction =
	| 'compact_messages'
	| 'delete_messages'
	| 'create_workflow_name'
	| 'auto_compact_messages'
	| 'cleanup_dangling'
	| 'clear_error_state'
	| 'continue';

export interface StateModifierInput {
	messages: BaseMessage[];
	workflowJSON: SimpleWorkflow;
	previousSummary?: string;
	coordinationLog?: CoordinationLogEntry[];
}

/**
 * Checks if there's an uncleared recursion error in the coordination log.
 * Returns true if there's a recursion error that hasn't been cleared yet.
 */
function hasUnclearedRecursionError(coordinationLog: CoordinationLogEntry[]): boolean {
	// Find the index of the last recursion error
	let lastRecursionErrorIndex = -1;
	for (let i = coordinationLog.length - 1; i >= 0; i--) {
		const entry = coordinationLog[i];
		if (entry.status !== 'error') continue;
		const errorMessage = entry.summary.toLowerCase();
		if (
			errorMessage.includes('recursion') ||
			errorMessage.includes('maximum number of steps') ||
			errorMessage.includes('iteration limit')
		) {
			lastRecursionErrorIndex = i;
			break;
		}
	}

	// If we found a recursion error, check if there's a clear entry after it
	if (lastRecursionErrorIndex >= 0) {
		const hasAlreadyCleared = coordinationLog
			.slice(lastRecursionErrorIndex + 1)
			.some(
				(entry) =>
					entry.phase === 'state_management' &&
					entry.summary.includes('Cleared') &&
					entry.summary.includes('recursion'),
			);

		return !hasAlreadyCleared;
	}

	return false;
}

/**
 * Determines if state modifications are needed before agent processing.
 * Pure function - no side effects, easily testable.
 */
export function determineStateAction(
	input: StateModifierInput,
	autoCompactThresholdTokens: number,
): StateModificationAction {
	const { messages, workflowJSON, coordinationLog } = input;

	// First check for dangling tool calls (from interrupted sessions)
	const danglingMessages = cleanupDanglingToolCallMessages(messages);
	if (danglingMessages.length > 0) {
		return 'cleanup_dangling';
	}

	const lastHumanMessage = messages.findLast((m) => m instanceof HumanMessage);
	if (!lastHumanMessage) return 'continue';

	// Check if there are RECURSION error entries in coordination log from previous turn
	// If user sent a new message, clear old recursion errors to allow continuation (AI-1812)
	// Only recursion errors - other errors should still block continuation
	// But only do this once - check if we've already added a clear_error_state entry AFTER the last recursion error
	if (coordinationLog && hasUnclearedRecursionError(coordinationLog)) {
		return 'clear_error_state';
	}

	// Manual /compact command
	if (lastHumanMessage.content === '/compact') {
		return 'compact_messages';
	}

	// Manual /clear command
	if (lastHumanMessage.content === '/clear') {
		return 'delete_messages';
	}

	// Auto-generate workflow name on first message with empty workflow
	const workflowName = workflowJSON?.name;
	const nodesLength = workflowJSON?.nodes?.length ?? 0;
	const isDefaultName = !workflowName || /^My workflow( \d+)?$/.test(workflowName);
	if (isDefaultName && nodesLength === 0 && messages.length === 1) {
		return 'create_workflow_name';
	}

	// Auto-compact when token threshold exceeded
	const estimatedTokens = estimateTokenCountFromMessages(messages);
	if (estimatedTokens > autoCompactThresholdTokens) {
		return 'auto_compact_messages';
	}

	return 'continue';
}

/**
 * Cleans up dangling tool call messages from interrupted sessions.
 * Returns state update with RemoveMessage instances.
 */
export function handleCleanupDangling(
	messages: BaseMessage[],
	logger?: Logger,
): { messages: RemoveMessage[] } {
	const messagesToRemove = cleanupDanglingToolCallMessages(messages);
	if (messagesToRemove.length > 0) {
		logger?.warn('Cleaning up dangling tool call messages', {
			count: messagesToRemove.length,
		});
	}
	return { messages: messagesToRemove };
}

/**
 * Compacts conversation history by summarizing it.
 * Used for both manual /compact and auto-compaction.
 *
 * For manual /compact: Removes all messages, routes to responder for acknowledgment.
 * For auto-compact: Removes old messages, preserves last user message to continue processing.
 */
export async function handleCompactMessages(
	messages: BaseMessage[],
	previousSummary: string,
	llm: BaseChatModel,
	isAutoCompact: boolean,
): Promise<{
	previousSummary: string;
	messages: BaseMessage[];
	coordinationLog: CoordinationLogEntry[];
}> {
	const lastHumanMessage = messages.findLast((m) => m instanceof HumanMessage);
	if (!lastHumanMessage) {
		throw new Error('Cannot compact messages: no HumanMessage found');
	}

	const compactedMessages = await conversationCompactChain(llm, messages, previousSummary);

	// For manual /compact: just remove messages, responder will generate acknowledgment
	// For auto-compact: remove messages but preserve the last user message to continue processing
	const newMessages: BaseMessage[] = [
		...messages.map((m) => new RemoveMessage({ id: m.id! })),
		...(isAutoCompact ? [new HumanMessage({ content: lastHumanMessage.content })] : []),
	];

	return {
		previousSummary: compactedMessages.summaryPlain,
		messages: newMessages,
		coordinationLog: [
			{
				phase: 'state_management',
				status: 'completed',
				timestamp: Date.now(),
				summary: isAutoCompact
					? 'Auto-compacted conversation due to token limit'
					: 'Manually compacted conversation history',
				metadata: createStateManagementMetadata({
					action: 'compact',
					messagesRemoved: messages.length,
				}),
			},
		],
	};
}

/**
 * Clears the session by removing all messages and resetting workflow.
 */
export function handleDeleteMessages(messages: BaseMessage[]): {
	messages: RemoveMessage[];
	workflowJSON: SimpleWorkflow;
	previousSummary: string;
	discoveryContext: null;
	coordinationLog: CoordinationLogEntry[];
	workflowOperations: [];
} {
	return {
		messages: messages.map((m) => new RemoveMessage({ id: m.id! })),
		workflowJSON: { nodes: [], connections: {}, name: '' },
		previousSummary: '',
		discoveryContext: null,
		coordinationLog: [
			{
				phase: 'state_management',
				status: 'completed',
				timestamp: Date.now(),
				summary: 'Cleared session and reset workflow',
				metadata: createStateManagementMetadata({ action: 'clear' }),
			},
		],
		workflowOperations: [],
	};
}

/**
 * Marks error entries as cleared to allow continuation after errors (AI-1812).
 * When a user sends a new message after hitting a recursion/error limit,
 * we add a marker entry that signals errors have been acknowledged.
 *
 * Note: We don't actually remove error entries because coordinationLog uses
 * a concat reducer, so filtering would be concatenated back. Instead, we add
 * a marker that determineStateAction uses to skip error clearing on subsequent checks.
 */
export function handleClearErrorState(
	coordinationLog: CoordinationLogEntry[],
	logger?: Logger,
): { coordinationLog: CoordinationLogEntry[] } {
	const errorCount = coordinationLog.filter((entry) => entry.status === 'error').length;

	if (errorCount > 0) {
		logger?.info('Marking error state as cleared to allow continuation', { errorCount });
	}

	// Add a marker entry that signals recursion errors have been acknowledged
	// The concat reducer will append this to existing entries
	return {
		coordinationLog: [
			{
				phase: 'state_management',
				status: 'completed',
				timestamp: Date.now(),
				summary: `Cleared ${errorCount} recursion error ${errorCount === 1 ? 'entry' : 'entries'} to allow continuation`,
				metadata: createStateManagementMetadata({ action: 'clear' }),
			},
		],
	};
}

/**
 * Generates a workflow name from the initial user message.
 */
export async function handleCreateWorkflowName(
	messages: BaseMessage[],
	workflowJSON: SimpleWorkflow,
	llm: BaseChatModel,
	logger?: Logger,
): Promise<{ workflowJSON: SimpleWorkflow }> {
	if (messages.length === 1 && messages[0] instanceof HumanMessage) {
		const initialMessage = messages[0];
		if (typeof initialMessage.content !== 'string') {
			logger?.debug('Initial message content is not a string, skipping workflow name generation');
			return { workflowJSON };
		}

		logger?.debug('Generating workflow name');
		const { name } = await workflowNameChain(llm, initialMessage.content);

		return {
			workflowJSON: { ...workflowJSON, name },
		};
	}
	return { workflowJSON };
}
