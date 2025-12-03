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
	| 'continue';

export interface StateModifierInput {
	messages: BaseMessage[];
	workflowJSON: SimpleWorkflow;
	previousSummary?: string;
}

/**
 * Determines if state modifications are needed before agent processing.
 * Pure function - no side effects, easily testable.
 */
export function determineStateAction(
	input: StateModifierInput,
	autoCompactThresholdTokens: number,
): StateModificationAction {
	const { messages, workflowJSON } = input;

	// First check for dangling tool calls (from interrupted sessions)
	const danglingMessages = cleanupDanglingToolCallMessages(messages);
	if (danglingMessages.length > 0) {
		return 'cleanup_dangling';
	}

	const lastHumanMessage = messages.findLast((m) => m instanceof HumanMessage);
	if (!lastHumanMessage) return 'continue';

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
