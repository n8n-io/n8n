import type { ChatRequest } from '@/types/assistant.types';
import {
	isTextMessage,
	isSummaryMessage,
	isAgentSuggestionMessage,
	isCodeDiffMessage,
	isWorkflowUpdatedMessage,
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
	 * Message transformer registry - maps message types to their transformation functions
	 */
	const messageTransformers = {
		text: (msg: ChatRequest.TextMessage, id: string): ChatUI.AssistantMessage => ({
			id,
			type: 'text',
			role: msg.role ?? 'assistant',
			content: msg.text,
			codeSnippet: msg.codeSnippet,
			read: true,
			quickReplies: msg.quickReplies,
		}),

		summary: (msg: ChatRequest.SummaryMessage, id: string): ChatUI.AssistantMessage => ({
			id,
			type: 'block',
			role: msg.role ?? 'assistant',
			title: msg.title,
			content: msg.content,
			read: true,
		}),

		'agent-suggestion': (
			msg: ChatRequest.AgentSuggestionMessage,
			id: string,
		): ChatUI.AssistantMessage => ({
			id,
			type: 'agent-suggestion',
			role: msg.role ?? 'assistant',
			title: msg.title,
			content: msg.text,
			suggestionId: msg.suggestionId ?? '',
			read: true,
		}),

		'code-diff': (msg: ChatRequest.CodeDiffMessage, id: string): ChatUI.AssistantMessage => ({
			id,
			type: 'code-diff',
			role: msg.role ?? 'assistant',
			description: msg.description,
			codeDiff: msg.codeDiff,
			suggestionId: msg.suggestionId ?? '',
			quickReplies: msg.quickReplies,
			read: true,
		}),

		'workflow-updated': (
			msg: ChatUI.WorkflowUpdatedMessage,
			id: string,
		): ChatUI.AssistantMessage => ({
			id,
			type: 'workflow-updated',
			role: 'assistant',
			codeSnippet: msg.codeSnippet,
			read: true,
		}),

		tool: (msg: ChatRequest.ToolMessage, id: string): ChatUI.AssistantMessage => ({
			id,
			type: 'tool',
			role: 'assistant',
			toolName: msg.toolName,
			toolCallId: msg.toolCallId,
			status: msg.status,
			updates: msg.updates,
			read: true,
		}),
	};

	/**
	 * Transform a single message from API format to UI format
	 */
	function transformMessage(
		msg: ChatRequest.MessageResponse,
		id: string,
	): ChatUI.AssistantMessage | null {
		if (isTextMessage(msg)) {
			return messageTransformers.text(msg, id);
		} else if (isSummaryMessage(msg)) {
			return messageTransformers.summary(msg, id);
		} else if (isAgentSuggestionMessage(msg)) {
			return messageTransformers['agent-suggestion'](msg, id);
		} else if (isCodeDiffMessage(msg)) {
			return messageTransformers['code-diff'](msg, id);
		} else if (isWorkflowUpdatedMessage(msg)) {
			return messageTransformers['workflow-updated'](msg, id);
		} else if (isToolMessage(msg)) {
			return messageTransformers.tool(msg, id);
		}

		// Skip agent thinking messages
		if (msg.type === 'intermediate-step') {
			return null;
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

	/**
	 * Update or add a tool message in the messages array
	 */
	function updateOrAddToolMessage(
		messages: ChatUI.AssistantMessage[],
		toolMessage: ChatUI.ToolMessage,
	): { messages: ChatUI.AssistantMessage[]; wasUpdated: boolean } {
		const existingIndex = messages.findIndex(
			(m) => m.type === 'tool' && m.toolCallId === toolMessage.toolCallId && m.status === 'running',
		);

		if (existingIndex > -1) {
			const existingMessage = messages[existingIndex] as ChatUI.ToolMessage;
			const updatedMessages = [...messages];
			updatedMessages[existingIndex] = {
				...existingMessage,
				status: toolMessage.status,
				updates: [...existingMessage.updates, ...toolMessage.updates],
			};
			return { messages: updatedMessages, wasUpdated: true };
		}

		return { messages: [...messages, toolMessage], wasUpdated: false };
	}

	/**
	 * Check if we should apply rating to messages
	 */
	function shouldShowRating(messages: ChatUI.AssistantMessage[]): boolean {
		return messages.some((msg) => msg.type === 'workflow-updated');
	}

	/**
	 * Apply showRating flag to text messages
	 */
	function applyShowRating(
		messages: ChatUI.AssistantMessage[],
		showRating: boolean,
	): ChatUI.AssistantMessage[] {
		return messages.map((message) => {
			if (message.type === 'text' && message.role === 'assistant') {
				return { ...message, showRating };
			}
			return message;
		});
	}

	/**
	 * Find the last assistant text message with rating
	 */
	function findLastAssistantTextIndex(messages: ChatUI.AssistantMessage[]): number {
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].type === 'text' && messages[i].role === 'assistant') {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Apply rating styles to messages immutably
	 */
	function applyRatingStyles(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
		const hasRunningTools = messages.some((m) => m.type === 'tool' && m.status === 'running');
		const lastAssistantTextIndex = findLastAssistantTextIndex(messages);

		return messages.map((message, index) => {
			if (message.type === 'text' && message.role === 'assistant' && message.showRating) {
				return {
					...message,
					ratingStyle: index === lastAssistantTextIndex && !hasRunningTools ? 'regular' : 'minimal',
				};
			}
			return message;
		});
	}

	/**
	 * Calculate thinking message based on tool statuses
	 */
	function calculateThinkingMessage(
		messages: ChatUI.AssistantMessage[],
		updatedToolStatus?: string,
	): string | undefined {
		if (updatedToolStatus === 'completed') {
			const hasRunningTools = messages.some((m) => m.type === 'tool' && m.status === 'running');
			if (!hasRunningTools) {
				return i18n.baseText('aiAssistant.thinkingSteps.processingResults');
			}
		}
		return undefined;
	}

	/**
	 * Process new messages and merge them with existing messages
	 */
	function mergeMessages(
		currentMessages: ChatUI.AssistantMessage[],
		newMessages: ChatRequest.MessageResponse[],
		id: string,
	): {
		messages: ChatUI.AssistantMessage[];
		thinkingMessage?: string;
	} {
		let messages = [...currentMessages];
		let thinkingMessage: string | undefined;

		for (const msg of newMessages) {
			const transformed = transformMessage(msg, id);
			if (!transformed) continue;

			// Special handling for tool messages
			if (transformed.type === 'tool') {
				const toolMessage = transformed as ChatUI.ToolMessage;

				// Only update existing messages if status is not 'running' or a running message already exists
				if (
					toolMessage.status !== 'running' ||
					messages.some(
						(m) =>
							m.type === 'tool' &&
							m.toolCallId === toolMessage.toolCallId &&
							m.status === 'running',
					)
				) {
					const result = updateOrAddToolMessage(messages, toolMessage);
					messages = result.messages;

					if (result.wasUpdated && toolMessage.status === 'completed') {
						thinkingMessage = calculateThinkingMessage(messages, toolMessage.status);
					}
				} else {
					messages.push(transformed);
				}
			} else {
				messages.push(transformed);
			}
		}

		return { messages, thinkingMessage };
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

		// Merge new messages with existing ones
		const { messages, thinkingMessage } = mergeMessages(currentMessages, newMessages, id);

		// Apply rating logic
		const hasWorkflowUpdate = shouldShowRating(messages);
		const messagesWithRating = applyShowRating(messages, hasWorkflowUpdate);
		const finalMessages = applyRatingStyles(messagesWithRating);

		return {
			messages: finalMessages,
			shouldClearThinking,
			thinkingMessage,
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
		return (
			transformMessage(msg, id) ?? {
				id,
				type: 'text',
				role: 'assistant',
				content: 'Unknown message type',
				read: true,
			}
		);
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
