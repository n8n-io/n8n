import type { ChatRequest } from '@/types/assistant.types';
import {
	isTextMessage,
	isSummaryMessage,
	isAgentSuggestionMessage,
	isAgentThinkingMessage,
	isCodeDiffMessage,
	isWorkflowUpdatedMessage,
	isRateWorkflowMessage,
	isToolMessage,
} from '@/types/assistant.types';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { useI18n } from '@n8n/i18n';

/**
 * Composable for handling AI chat messages with pure functions
 */
export function useAiMessages() {
	const i18n = useI18n();

	/**
	 * Process a single text message
	 */
	function processTextMessage(msg: ChatRequest.TextMessage, id: string): ChatUI.AssistantMessage {
		return {
			id,
			type: 'text',
			role: msg.role ?? 'assistant',
			content: msg.text,
			codeSnippet: msg.codeSnippet,
			read: true,
			quickReplies: msg.quickReplies,
		};
	}

	/**
	 * Process workflow updated messages
	 */
	function processWorkflowUpdatedMessage(
		msg: ChatUI.WorkflowUpdatedMessage,
		id: string,
	): ChatUI.AssistantMessage {
		return {
			id,
			type: 'workflow-updated',
			role: 'assistant',
			codeSnippet: msg.codeSnippet,
			read: true,
		};
	}

	/**
	 * Process a rate workflow message
	 */
	function processRateWorkflowMessage(
		msg: ChatRequest.RateWorkflowMessage,
		id: string,
	): ChatUI.AssistantMessage {
		return {
			id,
			type: 'rate-workflow',
			role: 'assistant',
			content: msg.content,
			read: true,
		};
	}

	/**
	 * Process a tool message
	 */
	function processToolMessage(
		msg: ChatRequest.ToolMessage,
		id: string,
		messages: ChatUI.AssistantMessage[],
	): {
		updatedMessages: ChatUI.AssistantMessage[];
		checkForProcessingMessage: boolean;
	} {
		const updatedMessages = [...messages];
		let checkForProcessingMessage = false;

		if (msg.status === 'running') {
			// Check if this is a progress update for an existing running tool
			const existingIndex = updatedMessages.findIndex(
				(m) => m.type === 'tool' && m.toolCallId === msg.toolCallId && m.status === 'running',
			);

			if (existingIndex > -1) {
				// Update existing running tool message
				const existingMessage = updatedMessages[existingIndex] as ChatUI.ToolMessage;
				updatedMessages[existingIndex] = {
					...existingMessage,
					updates: [...existingMessage.updates, ...msg.updates],
				} as ChatUI.AssistantMessage;
			} else {
				// Add new running tool message
				updatedMessages.push({
					id,
					type: 'tool',
					role: 'assistant',
					toolName: msg.toolName,
					toolCallId: msg.toolCallId,
					status: msg.status,
					updates: msg.updates,
					read: true,
				});
			}
		} else {
			// Handle completed/error status
			const existingIndex = updatedMessages.findIndex(
				(m) => m.type === 'tool' && m.toolCallId === msg.toolCallId && m.status === 'running',
			);

			if (existingIndex > -1) {
				// Update existing running tool message
				const existingMessage = updatedMessages[existingIndex] as ChatUI.ToolMessage;
				updatedMessages[existingIndex] = {
					...existingMessage,
					status: msg.status,
					updates: [...existingMessage.updates, ...msg.updates],
				} as ChatUI.AssistantMessage;
			} else {
				// Add new completed/error tool message (shouldn't happen normally)
				updatedMessages.push({
					id,
					type: 'tool',
					role: 'assistant',
					toolName: msg.toolName,
					toolCallId: msg.toolCallId,
					status: msg.status,
					updates: msg.updates,
					read: true,
				});
			}

			// Check if we should show processing message
			checkForProcessingMessage = msg.status === 'completed';
		}

		return { updatedMessages, checkForProcessingMessage };
	}

	/**
	 * Process assistant messages and return a new array with the processed messages
	 */
	function processAssistantMessages(
		currentMessages: ChatUI.AssistantMessage[],
		newMessages: ChatRequest.MessageResponse[],
		id: string,
	): {
		messages: ChatUI.AssistantMessage[];
		shouldClearThinking: boolean;
		thinkingMessage?: string;
	} {
		let messages = [...currentMessages];
		let shouldClearThinking = false;
		let thinkingMessage: string | undefined;

		// Clear thinking message when we get any response (text or tool)
		const hasResponse = newMessages.some((msg) => isTextMessage(msg) || isToolMessage(msg));
		if (hasResponse) {
			shouldClearThinking = true;
		}

		newMessages.forEach((msg) => {
			if (isTextMessage(msg)) {
				messages.push(processTextMessage(msg, id));
			} else if (isSummaryMessage(msg)) {
				// Handle summary message type from API (maps to SummaryBlock in UI)
				messages.push({
					id,
					type: 'block',
					role: msg.role ?? 'assistant',
					title: msg.title,
					content: msg.content,
					read: true,
				});
			} else if (isAgentSuggestionMessage(msg)) {
				// Handle agent suggestion message
				messages.push({
					id,
					type: 'agent-suggestion',
					role: msg.role ?? 'assistant',
					title: msg.title,
					content: msg.text,
					suggestionId: msg.suggestionId || '',
					read: true,
				});
			} else if (isAgentThinkingMessage(msg)) {
				// Handle agent thinking step
				// Handle intermediate-step messages (agent thinking)
				// These are not part of the final message array in the current UI
			} else if (isCodeDiffMessage(msg)) {
				// Handle code diff message
				messages.push({
					id,
					type: 'code-diff',
					role: msg.role ?? 'assistant',
					description: msg.description,
					codeDiff: msg.codeDiff,
					suggestionId: msg.suggestionId || '',
					quickReplies: msg.quickReplies,
					read: true,
				});
			} else if (isWorkflowUpdatedMessage(msg)) {
				messages.push(processWorkflowUpdatedMessage(msg, id));
			} else if (isRateWorkflowMessage(msg)) {
				messages.push(processRateWorkflowMessage(msg, id));
			} else if (isToolMessage(msg)) {
				const { updatedMessages, checkForProcessingMessage } = processToolMessage(
					msg,
					id,
					messages,
				);
				messages = updatedMessages;

				// Check if all tools are completed and show processing message
				if (checkForProcessingMessage) {
					const hasRunningTools = messages.some((m) => m.type === 'tool' && m.status === 'running');
					if (!hasRunningTools) {
						thinkingMessage = i18n.baseText('aiAssistant.thinkingSteps.processingResults');
					}
				}
			}
		});

		return { messages, shouldClearThinking, thinkingMessage };
	}

	/**
	 * Create a user message
	 */
	function createUserMessage(content: string, id: string): ChatUI.AssistantMessage {
		return {
			id,
			role: 'user',
			type: 'text',
			content,
			read: true,
		};
	}

	/**
	 * Create an error message
	 */
	function createErrorMessage(
		content: string,
		id: string,
		retry?: () => Promise<void>,
	): ChatUI.AssistantMessage {
		return {
			id,
			role: 'assistant',
			type: 'error',
			content,
			read: true,
			retry,
		};
	}

	/**
	 * Add messages to an array (pure function)
	 */
	function addMessages(
		currentMessages: ChatUI.AssistantMessage[],
		newMessages: ChatUI.AssistantMessage[],
	): ChatUI.AssistantMessage[] {
		return [...currentMessages, ...newMessages];
	}

	/**
	 * Clear all messages (pure function)
	 */
	function clearMessages(): ChatUI.AssistantMessage[] {
		return [];
	}

	/**
	 * Map a single assistant message from API format to UI format
	 */
	function mapAssistantMessageToUI(
		msg: ChatRequest.MessageResponse,
		id: string,
	): ChatUI.AssistantMessage {
		if (isTextMessage(msg)) {
			return processTextMessage(msg, id);
		} else if (isSummaryMessage(msg)) {
			return {
				id,
				type: 'block',
				role: 'assistant',
				title: msg.title,
				content: msg.content,
				read: true,
			};
		} else if (isAgentSuggestionMessage(msg)) {
			return {
				id,
				type: 'agent-suggestion',
				role: 'assistant',
				title: msg.title,
				content: msg.text,
				suggestionId: msg.suggestionId || '',
				read: true,
			};
		} else if (isCodeDiffMessage(msg)) {
			return {
				id,
				type: 'code-diff',
				role: 'assistant',
				description: msg.description,
				codeDiff: msg.codeDiff,
				suggestionId: msg.suggestionId || '',
				quickReplies: msg.quickReplies,
				read: true,
			};
		} else if (isWorkflowUpdatedMessage(msg)) {
			return processWorkflowUpdatedMessage(msg, id);
		} else if (isRateWorkflowMessage(msg)) {
			return processRateWorkflowMessage(msg, id);
		} else if (isToolMessage(msg)) {
			return {
				id,
				type: 'tool',
				role: 'assistant',
				toolName: msg.toolName,
				status: msg.status,
				updates: msg.updates,
				read: true,
			};
		}

		// Default fallback for unknown message types
		return {
			id,
			type: 'text',
			role: 'assistant',
			content: 'Unknown message type',
			read: true,
		};
	}

	return {
		processAssistantMessages,
		createUserMessage,
		createErrorMessage,
		addMessages,
		clearMessages,
		mapAssistantMessageToUI,
	};
}
