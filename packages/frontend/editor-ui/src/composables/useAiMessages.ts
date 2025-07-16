import type { ChatRequest } from '@/types/assistant.types';
import {
	isTextMessage,
	isSummaryMessage,
	isAgentSuggestionMessage,
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
	 * Create a tool message from request data
	 */
	function createToolMessage(msg: ChatRequest.ToolMessage, id: string): ChatUI.AssistantMessage {
		return {
			id,
			type: 'tool',
			role: 'assistant',
			toolName: msg.toolName,
			toolCallId: msg.toolCallId,
			status: msg.status,
			updates: msg.updates,
			read: true,
		};
	}

	/**
	 * Apply rating styles to messages immutably
	 */
	function applyRatingStyles(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
		// Check if there are any running tools
		const hasRunningTools = messages.some((m) => m.type === 'tool' && m.status === 'running');

		// Find the index of the last assistant text message
		let lastAssistantTextIndex = -1;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].type === 'text' && messages[i].role === 'assistant') {
				lastAssistantTextIndex = i;
				break;
			}
		}

		// Map through messages and apply appropriate rating styles
		return messages.map((message, index) => {
			if (message.type === 'text' && message.role === 'assistant' && message.showRating) {
				return {
					...message,
					// Only apply 'regular' style to the last message if all tools are completed
					ratingStyle: index === lastAssistantTextIndex && !hasRunningTools ? 'regular' : 'minimal',
				};
			}
			return message;
		});
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
		// Clear thinking message when we get any response (text or tool)
		const shouldClearThinking = newMessages.some((msg) => isTextMessage(msg) || isToolMessage(msg));

		// We'll determine if text messages should show ratings based on the presence of workflow-updated messages
		// in the overall message history after processing

		// Process all new messages using reduce
		const result = newMessages.reduce<{
			messages: ChatUI.AssistantMessage[];
			thinkingMessage?: string;
		}>(
			(acc, msg) => {
				if (isTextMessage(msg)) {
					return {
						...acc,
						messages: [...acc.messages, processTextMessage(msg, id)],
					};
				} else if (isSummaryMessage(msg)) {
					return {
						...acc,
						messages: [
							...acc.messages,
							{
								id,
								type: 'block',
								role: msg.role ?? 'assistant',
								title: msg.title,
								content: msg.content,
								read: true,
							},
						],
					};
				} else if (isAgentSuggestionMessage(msg)) {
					return {
						...acc,
						messages: [
							...acc.messages,
							{
								id,
								type: 'agent-suggestion',
								role: msg.role ?? 'assistant',
								title: msg.title,
								content: msg.text,
								suggestionId: msg.suggestionId ?? '',
								read: true,
							},
						],
					};
				} else if (isCodeDiffMessage(msg)) {
					return {
						...acc,
						messages: [
							...acc.messages,
							{
								id,
								type: 'code-diff',
								role: msg.role ?? 'assistant',
								description: msg.description,
								codeDiff: msg.codeDiff,
								suggestionId: msg.suggestionId ?? '',
								quickReplies: msg.quickReplies,
								read: true,
							},
						],
					};
				} else if (isWorkflowUpdatedMessage(msg)) {
					return {
						...acc,
						messages: [...acc.messages, processWorkflowUpdatedMessage(msg, id)],
					};
				} else if (isToolMessage(msg)) {
					const toolMessage = createToolMessage(msg, id);

					// Check if we need to update an existing tool message
					if (
						msg.status !== 'running' ||
						acc.messages.some(
							(m) => m.type === 'tool' && m.toolCallId === msg.toolCallId && m.status === 'running',
						)
					) {
						// Find and update existing tool message
						const existingIndex = acc.messages.findIndex(
							(m) => m.type === 'tool' && m.toolCallId === msg.toolCallId && m.status === 'running',
						);

						if (existingIndex > -1) {
							const existingMessage = acc.messages[existingIndex] as ChatUI.ToolMessage;
							const updatedMessages = [...acc.messages];
							updatedMessages[existingIndex] = {
								...existingMessage,
								status: msg.status,
								updates: [...existingMessage.updates, ...msg.updates],
							};

							// Check if we should show processing message
							let thinkingMessage = acc.thinkingMessage;
							if (msg.status === 'completed') {
								const hasRunningTools = updatedMessages.some(
									(m) => m.type === 'tool' && m.status === 'running',
								);
								if (!hasRunningTools) {
									thinkingMessage = i18n.baseText('aiAssistant.thinkingSteps.processingResults');
								}
							}

							return { messages: updatedMessages, thinkingMessage };
						}
					}

					// Add new tool message
					return {
						...acc,
						messages: [...acc.messages, toolMessage],
					};
				}

				return acc;
			},
			{ messages: [...currentMessages], thinkingMessage: undefined },
		);

		// Check if there are any workflow-updated messages in the entire message history
		const hasWorkflowUpdate = result.messages.some((msg) => msg.type === 'workflow-updated');

		// Apply showRating to text messages only if workflow-updated messages exist
		const messagesWithRating = result.messages.map((message) => {
			if (message.type === 'text' && message.role === 'assistant') {
				return {
					...message,
					showRating: hasWorkflowUpdate,
				};
			}
			return message;
		});

		// Apply rating styles
		const finalMessages = applyRatingStyles(messagesWithRating);

		return {
			messages: finalMessages,
			shouldClearThinking,
			thinkingMessage: result.thinkingMessage,
		};
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
				suggestionId: msg.suggestionId ?? '',
				read: true,
			};
		} else if (isCodeDiffMessage(msg)) {
			return {
				id,
				type: 'code-diff',
				role: 'assistant',
				description: msg.description,
				codeDiff: msg.codeDiff,
				suggestionId: msg.suggestionId ?? '',
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
