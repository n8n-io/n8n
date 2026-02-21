import type { ChatUI } from '@n8n/design-system/types/assistant';
import type { ChatRequest, PlanMode } from '../assistant.types';
import { useI18n } from '@n8n/i18n';
import {
	isTextMessage,
	isWorkflowUpdatedMessage,
	isToolMessage,
	isQuestionsMessage,
	isPlanMessage,
	isUserAnswersMessage,
	isMessagesCompactedEvent,
} from '../assistant.types';
import { generateShortId } from '../builder.utils';

export interface MessageProcessingResult {
	messages: ChatUI.AssistantMessage[];
	thinkingMessage?: string;
	shouldClearThinking: boolean;
}

/**
 * Factory functions for creating custom UI messages.
 * Shared between streaming (processSingleMessage) and session replay (mapAssistantMessageToUI).
 */
function createQuestionsUIMessage(
	id: string,
	questions: PlanMode.PlannerQuestion[],
	introMessage?: string,
): ChatUI.AssistantMessage {
	return {
		id,
		role: 'assistant',
		type: 'custom',
		customType: 'questions',
		data: { questions, introMessage },
		read: false,
	} satisfies ChatUI.AssistantMessage;
}

function createPlanUIMessage(id: string, plan: PlanMode.PlanOutput): ChatUI.AssistantMessage {
	return {
		id,
		role: 'assistant',
		type: 'custom',
		customType: 'plan',
		data: { plan },
		read: false,
	} satisfies ChatUI.AssistantMessage;
}

function createUserAnswersUIMessage(
	id: string,
	answers: PlanMode.QuestionResponse[],
): ChatUI.AssistantMessage {
	return {
		id,
		role: 'user',
		type: 'custom',
		customType: 'user_answers',
		data: { answers },
	} satisfies ChatUI.AssistantMessage;
}

export function useBuilderMessages() {
	const locale = useI18n();

	/**
	 * Clear rating from all messages
	 */
	function clearRatingLogic(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
		return messages.map((message) => {
			if (message.type === 'text' && 'showRating' in message) {
				// Pick all properties except showRating and ratingStyle
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { showRating, ratingStyle, ...cleanMessage } = message;
				return cleanMessage;
			}
			return message;
		});
	}

	/**
	 * Apply rating logic to messages - only show rating on the last AI text message after workflow-updated
	 * when no tools are running
	 */
	function applyRatingLogic(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
		const { hasAnyRunningTools, isStillThinking } = getThinkingState(messages);

		// Don't apply rating if tools are still running
		if (hasAnyRunningTools || isStillThinking) {
			// Remove any existing ratings
			return clearRatingLogic(messages);
		}

		// Find the index of the last workflow-updated message
		let lastWorkflowUpdateIndex = -1;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].type === 'workflow-updated') {
				lastWorkflowUpdateIndex = i;
				break;
			}
		}

		// If no workflow-updated, return messages as-is
		if (lastWorkflowUpdateIndex === -1) {
			return messages;
		}

		// Find the last assistant text message after workflow-updated
		let lastAssistantTextIndex = -1;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (
				messages[i].type === 'text' &&
				messages[i].role === 'assistant' &&
				i > lastWorkflowUpdateIndex
			) {
				lastAssistantTextIndex = i;
				break;
			}
		}

		// Apply rating only to the last assistant text message after workflow-updated
		return messages.map((message, index) => {
			if (
				message.type === 'text' &&
				message.role === 'assistant' &&
				index === lastAssistantTextIndex
			) {
				return {
					...message,
					showRating: true,
					ratingStyle: 'minimal',
				};
			}
			// Remove any existing rating from other messages
			if (message.type === 'text' && 'showRating' in message) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { showRating, ratingStyle, ...cleanMessage } = message;
				return cleanMessage;
			}
			return message;
		});
	}

	/**
	 * Process a tool message - either update existing or add new
	 */
	function processToolMessage(
		messages: ChatUI.AssistantMessage[],
		msg: ChatRequest.ToolMessage,
		messageId: string,
	): void {
		// Check if we already have this tool message
		const existingIndex = msg.toolCallId
			? messages.findIndex((m) => m.type === 'tool' && m.toolCallId === msg.toolCallId)
			: -1;

		if (existingIndex !== -1) {
			// Update existing tool message - merge updates array and update display title
			const existing = messages[existingIndex] as ChatUI.ToolMessage;
			const toolMessage: ChatUI.ToolMessage = {
				...existing,
				id: `${messageId}-${msg.toolCallId}`,
				status: msg.status,
				customDisplayTitle: msg.customDisplayTitle ?? existing.customDisplayTitle,
				updates: [...(existing.updates || []), ...(msg.updates || [])],
			};
			messages[existingIndex] = toolMessage as ChatUI.AssistantMessage;
		} else {
			// Add new tool message
			const toolMessage: ChatUI.AssistantMessage = {
				id: `${messageId}-${msg.toolCallId}`,
				role: 'assistant',
				type: 'tool',
				toolName: msg.toolName,
				toolCallId: msg.toolCallId,
				displayTitle: msg.displayTitle,
				customDisplayTitle: msg.customDisplayTitle,
				status: msg.status,
				updates: msg.updates || [],
				read: false,
			};
			messages.push(toolMessage);
		}
	}

	/**
	 * Process a single message and add it to the messages array
	 */
	function processSingleMessage(
		messages: ChatUI.AssistantMessage[],
		msg: ChatRequest.MessageResponse,
		messageId: string,
		retry?: () => Promise<void>,
	): boolean {
		let shouldClearThinking = false;

		if (isTextMessage(msg)) {
			messages.push({
				id: messageId,
				role: 'assistant',
				type: 'text',
				content: msg.text,
				read: false,
			} satisfies ChatUI.AssistantMessage);
			shouldClearThinking = true;
		} else if (isQuestionsMessage(msg)) {
			// Check if we already have a questions message (prevent duplicates from streaming)
			const existingQuestionsIndex = messages.findIndex(
				(m) => m.type === 'custom' && 'customType' in m && m.customType === 'questions',
			);
			// Only add if no questions message exists, or if there's a user answer after the existing one
			// (meaning this is a new round of questions)
			const hasUserAnswerAfterQuestions =
				existingQuestionsIndex !== -1 &&
				messages.slice(existingQuestionsIndex + 1).some((m) => m.role === 'user');
			if (existingQuestionsIndex === -1 || hasUserAnswerAfterQuestions) {
				messages.push(createQuestionsUIMessage(messageId, msg.questions, msg.introMessage));
			}
			shouldClearThinking = true;
		} else if (isPlanMessage(msg)) {
			// Find the last existing plan message
			const existingPlanIndex = messages.findLastIndex(
				(m) => m.type === 'custom' && 'customType' in m && m.customType === 'plan',
			);
			// A plan is new if there's a user message after the last plan (modify flow)
			const hasUserResponseAfterPlan =
				existingPlanIndex !== -1 &&
				messages.slice(existingPlanIndex + 1).some((m) => m.role === 'user');
			if (existingPlanIndex === -1 || hasUserResponseAfterPlan) {
				messages.push(createPlanUIMessage(messageId, msg.plan));
			}
			shouldClearThinking = true;
		} else if (isUserAnswersMessage(msg)) {
			// User answers from session replay - render as custom message
			messages.push(createUserAnswersUIMessage(messageId, msg.answers));
			shouldClearThinking = true;
		} else if (isWorkflowUpdatedMessage(msg)) {
			messages.push({
				...msg,
				id: messageId,
				read: false,
			} satisfies ChatUI.AssistantMessage);
			// Don't clear thinking for workflow updates - they're just state changes
		} else if (isToolMessage(msg)) {
			processToolMessage(messages, msg, messageId);
		} else if ('type' in msg && msg.type === 'error' && 'content' in msg) {
			// Handle error messages from the API
			// API sends error messages with type: 'error' and content field
			messages.push({
				id: messageId,
				role: 'assistant',
				type: 'error',
				content: msg.content,
				read: false,
				retry,
			});
			shouldClearThinking = true;
		}

		return shouldClearThinking;
	}

	function getToolMessages(messages: ChatUI.AssistantMessage[]): ChatUI.ToolMessage[] {
		return messages.filter((msg): msg is ChatUI.ToolMessage => msg.type === 'tool');
	}

	function getRunningTools(messages: ChatUI.AssistantMessage[]) {
		return getToolMessages(messages).filter((msg) => msg.status === 'running');
	}

	/**
	 * If any tools are running, then it's still running tools and not done thinking
	 * If all tools are done and no text response yet, then it's still thinking
	 * Otherwise, it's done
	 *
	 * @param messages
	 * @returns
	 */
	function getThinkingState(messages: ChatUI.AssistantMessage[]): {
		hasAnyRunningTools: boolean;
		isStillThinking: boolean;
	} {
		const hasAnyRunningTools = getRunningTools(messages).length > 0;
		if (hasAnyRunningTools) {
			return {
				hasAnyRunningTools: true,
				isStillThinking: false,
			};
		}

		const hasCompletedTools = getToolMessages(messages).some((msg) => msg.status === 'completed');

		// Find the last completed tool message
		let lastCompletedToolIndex = -1;
		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (msg.type === 'tool' && msg.status === 'completed') {
				lastCompletedToolIndex = i;
				break;
			}
		}

		// Check if there's any text or custom message after the last completed tool
		// Note: workflow-updated messages shouldn't count as they're just canvas state updates
		// Custom messages (like plan messages) should count as responses
		let hasResponseAfterTools = false;
		if (lastCompletedToolIndex !== -1) {
			for (let i = lastCompletedToolIndex + 1; i < messages.length; i++) {
				const msg = messages[i];
				if (msg.type === 'text' || msg.type === 'custom') {
					hasResponseAfterTools = true;
					break;
				}
			}
		}

		return {
			hasAnyRunningTools: false,
			isStillThinking: hasCompletedTools && !hasResponseAfterTools,
		};
	}

	/**
	 * Determine the thinking message based on tool states
	 */
	function determineThinkingMessage(messages: ChatUI.AssistantMessage[]): string | undefined {
		const { hasAnyRunningTools, isStillThinking } = getThinkingState(messages);

		if (hasAnyRunningTools) {
			const runningTools = getRunningTools(messages);
			const lastRunningTool = runningTools[runningTools.length - 1];
			if (lastRunningTool) {
				const toolName = lastRunningTool.customDisplayTitle || lastRunningTool.displayTitle;
				if (toolName) {
					return toolName;
				}
			}

			return locale.baseText('aiAssistant.thinkingSteps.thinking');
		}

		// If no tools are running but we're still thinking (all tools completed, waiting for response)
		if (!hasAnyRunningTools && isStillThinking) {
			return locale.baseText('aiAssistant.thinkingSteps.thinking');
		}

		return undefined;
	}

	function processAssistantMessages(
		currentMessages: ChatUI.AssistantMessage[],
		newMessages: ChatRequest.MessageResponse[],
		userMessageId: string,
		retry?: () => Promise<void>,
	): MessageProcessingResult {
		const mutableMessages = [...currentMessages];
		let shouldClearThinking = false;

		// If this batch contains a compaction event, clear all existing messages first
		const hasCompaction = newMessages.some(isMessagesCompactedEvent);
		if (hasCompaction) {
			mutableMessages.length = 0;
		}

		const messageGroupId = generateShortId();

		newMessages.forEach((msg, index) => {
			// Generate unique ID for each message in the batch, based on original user message id.
			// Used in telemetry to track events related to a specific user message
			const messageId = `${userMessageId}--${messageGroupId}--${index}`;
			const clearThinking = processSingleMessage(mutableMessages, msg, messageId, retry);
			shouldClearThinking = shouldClearThinking || clearThinking;
		});

		// Show "Compacting" while waiting for the responder acknowledgment
		const thinkingMessage = hasCompaction
			? locale.baseText('aiAssistant.thinkingSteps.compacting')
			: determineThinkingMessage(mutableMessages);

		// Rating is now handled in the footer of AskAssistantChat, not per-message
		// Remove retry from all error messages except the last one
		const messagesWithRetryLogic = removeRetryFromOldErrorMessages(mutableMessages);

		return {
			messages: messagesWithRetryLogic,
			thinkingMessage,
			shouldClearThinking: shouldClearThinking && mutableMessages.length > currentMessages.length,
		};
	}

	function removeRetryFromOldErrorMessages(messages: ChatUI.AssistantMessage[]) {
		// Remove retry from all error messages except the last one
		return messages.map((message, index) => {
			if (message.type === 'error' && message.retry && index !== messages.length - 1) {
				const { retry, ...messageWithoutRetry } = message;
				return messageWithoutRetry;
			}
			return message;
		});
	}

	function createUserMessage(
		content: string,
		id: string,
		revertVersion?: { id: string; createdAt: string },
		focusedNodeNames?: string[],
	): ChatUI.AssistantMessage {
		return {
			id,
			role: 'user',
			type: 'text',
			content,
			revertVersion,
			...(focusedNodeNames && focusedNodeNames.length > 0 ? { focusedNodeNames } : {}),
			read: true,
		};
	}

	/**
	 * Create a custom user message for displaying answers to plan mode questions.
	 * This shows the user's answers in a nicely formatted way rather than raw JSON.
	 */
	function createUserAnswersMessage(
		answers: PlanMode.QuestionResponse[],
		id: string,
	): PlanMode.UserAnswersMessage {
		return {
			id,
			role: 'user',
			type: 'custom',
			customType: 'user_answers',
			data: {
				answers,
			},
		};
	}

	function createAssistantMessage(
		content: string,
		id: string,
		options: { aborted: true },
	): ChatUI.TaskAbortedMessage;
	function createAssistantMessage(
		content: string,
		id: string,
		options?: { aborted?: false },
	): ChatUI.TextMessage;
	function createAssistantMessage(
		content: string,
		id: string,
		options?: { aborted?: boolean },
	): ChatUI.AssistantMessage {
		if (options?.aborted) {
			return {
				id,
				role: 'assistant',
				type: 'text',
				content,
				read: true,
				aborted: true,
			};
		}
		return {
			id,
			role: 'assistant',
			type: 'text',
			content,
			read: true,
		};
	}

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
			retry,
			read: false,
		};
	}

	function clearMessages(): ChatUI.AssistantMessage[] {
		return [];
	}

	function addMessages(
		currentMessages: ChatUI.AssistantMessage[],
		newMessages: ChatUI.AssistantMessage[],
	): ChatUI.AssistantMessage[] {
		return [...currentMessages, ...newMessages];
	}

	function mapAssistantMessageToUI(
		message: ChatRequest.MessageResponse,
		id: string,
	): ChatUI.AssistantMessage {
		// Handle specific message types using type guards
		if (isTextMessage(message)) {
			return {
				id,
				role: message.role ?? 'assistant',
				type: 'text',
				content: message.text,
				revertVersion: message.revertVersion,
				read: false,
			} satisfies ChatUI.AssistantMessage;
		}

		if (isQuestionsMessage(message)) {
			return createQuestionsUIMessage(id, message.questions, message.introMessage);
		}

		if (isPlanMessage(message)) {
			return createPlanUIMessage(id, message.plan);
		}

		if (isUserAnswersMessage(message)) {
			return createUserAnswersUIMessage(id, message.answers);
		}

		if (isWorkflowUpdatedMessage(message)) {
			return {
				...message,
				id,
				read: false,
			} satisfies ChatUI.AssistantMessage;
		}

		if (isToolMessage(message)) {
			return {
				id,
				role: 'assistant',
				type: 'tool',
				toolName: message.toolName,
				toolCallId: message.toolCallId,
				displayTitle: message.displayTitle,
				customDisplayTitle: message.customDisplayTitle,
				status: message.status,
				updates: message.updates || [],
				read: false,
			} satisfies ChatUI.AssistantMessage;
		}

		// Handle event messages
		if ('type' in message && message.type === 'event') {
			return {
				...message,
				id,
				read: false,
			} satisfies ChatUI.AssistantMessage;
		}

		// Default fallback
		return {
			id,
			role: 'assistant',
			type: 'text',
			content: locale.baseText('aiAssistant.thinkingSteps.thinking'),
			read: false,
		} satisfies ChatUI.AssistantMessage;
	}

	return {
		processAssistantMessages,
		createUserMessage,
		createUserAnswersMessage,
		createAssistantMessage,
		createErrorMessage,
		clearMessages,
		addMessages,
		mapAssistantMessageToUI,
		applyRatingLogic,
		clearRatingLogic,
		getRunningTools,
	};
}
