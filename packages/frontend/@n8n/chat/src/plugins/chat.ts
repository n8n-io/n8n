import { v4 as uuidv4 } from 'uuid';
import { type Plugin, computed, nextTick, ref, type Ref } from 'vue';

import * as api from '@n8n/chat/api';
import { ChatOptionsSymbol, ChatSymbol, localStorageSessionIdKey } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';
import type {
	ChatMessage,
	ChatOptions,
	ChatMessageText,
	SendMessageResponse,
} from '@n8n/chat/types';
import { StreamingMessageManager, createBotMessage } from '@n8n/chat/utils/streaming';
import {
	handleStreamingChunk,
	handleNodeStart,
	handleNodeComplete,
} from '@n8n/chat/utils/streamingHandlers';

/**
 * Creates a new user message object with a unique ID
 * @param text - The message text content
 * @param files - Optional array of files attached to the message
 * @returns A ChatMessage object representing the user's message
 */
function createUserMessage(text: string, files: File[] = []): ChatMessage {
	return {
		id: uuidv4(),
		text,
		sender: 'user',
		files,
	};
}

/**
 * Extracts text content from a message response
 * Falls back to JSON stringification if no text is found but the response object has data
 * @param response - The response object from the API
 * @returns The extracted text message or stringified response
 */
function processMessageResponse(response: SendMessageResponse): string {
	let textMessage = response.output ?? response.text ?? response.message ?? '';

	if (textMessage === '' && Object.keys(response).length > 0) {
		try {
			textMessage = JSON.stringify(response, null, 2);
		} catch (e) {
			// Failed to stringify the object so fallback to empty string
		}
	}

	return textMessage;
}

interface EmptyStreamConfig {
	receivedMessage: Ref<ChatMessageText | null>;
	messages: Ref<ChatMessage[]>;
}

/**
 * Handles the case when a streaming response returns no chunks
 * Creates an error message explaining the likely cause
 * @param config - Configuration object containing message refs
 */
function handleEmptyStreamResponse(config: EmptyStreamConfig): void {
	const { receivedMessage, messages } = config;

	if (!receivedMessage.value) {
		receivedMessage.value = createBotMessage();
		messages.value.push(receivedMessage.value);
	} else {
		// Check if any existing messages have content
		const hasContent = messages.value.some(
			(msg) => msg.sender === 'bot' && 'text' in msg && msg.text.trim().length > 0,
		);
		if (!hasContent) {
			receivedMessage.value = createBotMessage();
			messages.value.push(receivedMessage.value);
		}
	}
	receivedMessage.value.text =
		'[No response received. This could happen if streaming is enabled in the trigger but disabled in agent node(s)]';
}

interface ErrorConfig {
	error: unknown;
	receivedMessage: Ref<ChatMessageText | null>;
	messages: Ref<ChatMessage[]>;
}

/**
 * Handles errors that occur during message sending
 * Creates an error message for the user and logs the error to console
 * @param config - Configuration object containing error and message refs
 */
function handleMessageError(config: ErrorConfig): void {
	const { error, receivedMessage, messages } = config;

	receivedMessage.value ??= createBotMessage();
	receivedMessage.value.text = 'Error: Failed to receive response';

	// Ensure the error message is added to messages array if not already there
	if (!messages.value.includes(receivedMessage.value)) {
		messages.value.push(receivedMessage.value);
	}

	console.error('Chat API error:', error);
}

interface StreamingMessageConfig {
	text: string;
	files: File[];
	sessionId: string;
	options: ChatOptions;
	messages: Ref<ChatMessage[]>;
	receivedMessage: Ref<ChatMessageText | null>;
	streamingManager: StreamingMessageManager;
}

/**
 * Handles sending messages with streaming enabled
 * Sets up streaming event handlers and processes the response chunks
 * @param config - Configuration object for streaming message handling
 */
async function handleStreamingMessage(config: StreamingMessageConfig): Promise<void> {
	const { text, files, sessionId, options, messages, receivedMessage, streamingManager } = config;

	const handlers: api.StreamingEventHandlers = {
		onChunk: (chunk: string, nodeId?: string, runIndex?: number) => {
			handleStreamingChunk(chunk, nodeId, streamingManager, receivedMessage, messages, runIndex);
		},
		onBeginMessage: (nodeId: string, runIndex?: number) => {
			handleNodeStart(nodeId, streamingManager, runIndex);
		},
		onEndMessage: (nodeId: string, runIndex?: number) => {
			handleNodeComplete(nodeId, streamingManager, runIndex);
		},
	};

	const { hasReceivedChunks } = await api.sendMessageStreaming(
		text,
		files,
		sessionId,
		options,
		handlers,
	);

	// Check if no chunks were received (empty stream)
	if (!hasReceivedChunks) {
		handleEmptyStreamResponse({ receivedMessage, messages });
	}
}

interface NonStreamingMessageConfig {
	text: string;
	files: File[];
	sessionId: string;
	options: ChatOptions;
}

/**
 * Handles sending messages without streaming
 * Sends the message and processes the complete response
 * @param config - Configuration object for non-streaming message handling
 * @returns The API response or a bot message
 */
async function handleNonStreamingMessage(
	config: NonStreamingMessageConfig,
): Promise<{ response?: SendMessageResponse; botMessage?: ChatMessageText }> {
	const { text, files, sessionId, options } = config;

	const sendMessageResponse = await api.sendMessage(text, files, sessionId, options);

	if (sendMessageResponse?.executionStarted) {
		return { response: sendMessageResponse };
	}

	const receivedMessage = createBotMessage();
	receivedMessage.text = processMessageResponse(sendMessageResponse);
	return { botMessage: receivedMessage };
}

export const ChatPlugin: Plugin<ChatOptions> = {
	install(app, options) {
		app.provide(ChatOptionsSymbol, options);

		const messages = ref<ChatMessage[]>([]);
		const currentSessionId = ref<string | null>(null);
		const waitingForResponse = ref(false);

		const initialMessages = computed<ChatMessage[]>(() =>
			(options.initialMessages ?? []).map((text) => ({
				id: uuidv4(),
				text,
				sender: 'bot',
			})),
		);

		async function sendMessage(
			text: string,
			files: File[] = [],
		): Promise<SendMessageResponse | null> {
			// Create and add user message
			const sentMessage = createUserMessage(text, files);
			messages.value.push(sentMessage);
			waitingForResponse.value = true;

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
			});

			const receivedMessage = ref<ChatMessageText | null>(null);
			const streamingManager = new StreamingMessageManager();

			try {
				if (options?.enableStreaming) {
					await handleStreamingMessage({
						text,
						files,
						sessionId: currentSessionId.value as string,
						options,
						messages,
						receivedMessage,
						streamingManager,
					});
				} else {
					const result = await handleNonStreamingMessage({
						text,
						files,
						sessionId: currentSessionId.value as string,
						options,
					});

					if (result.response?.executionStarted) {
						waitingForResponse.value = false;
						return result.response;
					}

					if (result.botMessage) {
						receivedMessage.value = result.botMessage;
						messages.value.push(result.botMessage);
					}
				}
			} catch (error) {
				handleMessageError({ error, receivedMessage, messages });
			} finally {
				waitingForResponse.value = false;
			}

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
			});

			return null;
		}

		async function loadPreviousSession() {
			if (!options.loadPreviousSession) {
				return;
			}

			const sessionId = localStorage.getItem(localStorageSessionIdKey) ?? uuidv4();
			const previousMessagesResponse = await api.loadPreviousSession(sessionId, options);

			messages.value = (previousMessagesResponse?.data || []).map((message, index) => ({
				id: `${index}`,
				text: message.kwargs.content,
				sender: message.id.includes('HumanMessage') ? 'user' : 'bot',
			}));

			if (messages.value.length) {
				currentSessionId.value = sessionId;
			}

			return sessionId;
		}

		// eslint-disable-next-line @typescript-eslint/require-await
		async function startNewSession() {
			currentSessionId.value = uuidv4();

			localStorage.setItem(localStorageSessionIdKey, currentSessionId.value);
		}

		const chatStore = {
			initialMessages,
			messages,
			currentSessionId,
			waitingForResponse,
			loadPreviousSession,
			startNewSession,
			sendMessage,
		};

		app.provide(ChatSymbol, chatStore);
		app.config.globalProperties.$chat = chatStore;
	},
};
