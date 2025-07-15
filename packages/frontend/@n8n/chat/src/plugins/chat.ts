import { v4 as uuidv4 } from 'uuid';
import type { Plugin } from 'vue';
import { computed, nextTick, ref } from 'vue';

import * as api from '@n8n/chat/api';
import { ChatOptionsSymbol, ChatSymbol, localStorageSessionIdKey } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';
import type {
	ChatMessage,
	ChatOptions,
	ChatMessageText,
	ChatMessageRich,
	StructuredChunk,
} from '@n8n/chat/types';
import {
	StreamingMessageManager,
	createBotMessage,
	createRichBotMessage,
} from '@n8n/chat/utils/streaming';
import {
	handleStreamingChunk,
	handleNodeStart,
	handleNodeComplete,
} from '@n8n/chat/utils/streamingHandlers';

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

		async function sendMessage(text: string, files: File[] = []) {
			const sentMessage: ChatMessage = {
				id: uuidv4(),
				text,
				sender: 'user',
				files,
			};

			messages.value.push(sentMessage);
			waitingForResponse.value = true;

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
			});

			const receivedMessage = ref<ChatMessageText | null>(null);
			const streamingManager = new StreamingMessageManager();

			try {
				if (options?.enableStreaming) {
					const handlers: api.StreamingEventHandlers = {
						onChunk: (
							chunk: string,
							nodeId?: string,
							runIndex?: number,
							chunkData?: StructuredChunk,
						) => {
							handleStreamingChunk(
								chunk,
								nodeId,
								streamingManager,
								receivedMessage,
								messages,
								runIndex,
								chunkData,
							);
						},
						onBeginMessage: (nodeId: string, runIndex?: number) => {
							handleNodeStart(nodeId, streamingManager, runIndex);
						},
						onEndMessage: (nodeId: string, runIndex?: number) => {
							handleNodeComplete(nodeId, streamingManager, runIndex);
						},
					};

					await api.sendMessageStreaming(
						text,
						files,
						currentSessionId.value as string,
						options,
						handlers,
					);
				} else {
					const sendMessageResponse = await api.sendMessage(
						text,
						files,
						currentSessionId.value as string,
						options,
					);

					console.log('Raw sendMessage response:', sendMessageResponse);

					// Check if response has data property (webhook response wrapper)
					const actualResponse = sendMessageResponse.data || sendMessageResponse;
					console.log('Processed response:', actualResponse);

					// Check if this is a rich content response
					if (actualResponse && actualResponse.type === 'rich' && actualResponse.content) {
						const richMessage = createRichBotMessage(actualResponse.content);
						messages.value.push(richMessage);
					} else {
						// Handle regular text response
						let textContent = '';

						try {
							if (Array.isArray(actualResponse)) {
								textContent = actualResponse
									.map(
										(item) =>
											(item as any).text ||
											(item as any).output ||
											(item as any).message ||
											String(item),
									)
									.join('\n\n');
							} else if (typeof actualResponse === 'string') {
								// Handle direct string responses
								textContent = actualResponse;
							} else if (actualResponse && typeof actualResponse === 'object') {
								// Try various text properties
								const response = actualResponse as any;
								textContent =
									response.text ||
									response.output ||
									response.message ||
									response.content ||
									(typeof response.content === 'string' ? response.content : '') ||
									JSON.stringify(actualResponse);
							} else {
								textContent = String(actualResponse || 'Empty response');
							}

							// Ensure we have some content
							if (!textContent || textContent.trim() === '') {
								textContent = 'Empty response received';
							}
						} catch (parseError) {
							console.error('Error processing response content:', parseError);
							textContent = 'Error: Unable to process response';
						}

						const botMessage = createBotMessage();
						botMessage.text = textContent;
						messages.value.push(botMessage);
					}
				}
			} catch (error) {
				console.error('Chat error:', error);

				let errorMessage = 'Error: Failed to receive response';

				// Extract more specific error information
				if (error instanceof Error) {
					if (error.message.includes('fetch')) {
						errorMessage = 'Error: Unable to connect to server';
					} else if (error.message.includes('JSON')) {
						errorMessage = 'Error: Invalid response format';
					} else if (error.message.includes('Network')) {
						errorMessage = 'Error: Network connection failed';
					} else if (error.message) {
						errorMessage = `Error: ${error.message}`;
					}
				} else if (typeof error === 'string') {
					errorMessage = `Error: ${error}`;
				}

				if (!receivedMessage.value) {
					receivedMessage.value = createBotMessage();
					messages.value.push(receivedMessage.value);
				}
				if (receivedMessage.value && 'text' in receivedMessage.value) {
					receivedMessage.value.text = errorMessage;
				}
			} finally {
				waitingForResponse.value = false;
			}

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
			});
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
