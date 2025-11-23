import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from 'vue';

import * as api from '@n8n/chat/api';
import type { StreamingEventHandlers } from '@n8n/chat/api/message';
import { localStorageSessionIdKey } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';
import { ChatPlugin } from '@n8n/chat/plugins/chat';
import type { Chat, ChatOptions, LoadPreviousSessionResponse } from '@n8n/chat/types';

// Mock dependencies
vi.mock('@n8n/chat/api');
vi.mock('@n8n/chat/event-buses', () => ({
	chatEventBus: {
		emit: vi.fn(),
	},
}));

// Helper function to set up chat store with proper typing
function setupChatStore(options: ChatOptions): Chat {
	const app = createApp({
		template: '<div></div>',
	});
	app.use(ChatPlugin, options);
	return app.config.globalProperties.$chat as Chat;
}

describe('ChatPlugin', () => {
	let mockOptions: ChatOptions;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Setup default options
		mockOptions = {
			webhookUrl: 'http://localhost:5678/webhook',
			chatInputKey: 'message',
			chatSessionKey: 'sessionId',
			enableStreaming: false,
			initialMessages: [], // Explicitly set to empty to override defaults
			i18n: {
				en: {
					title: 'Test Chat',
					subtitle: 'Test subtitle',
					footer: '',
					getStarted: 'Start',
					inputPlaceholder: 'Type a message...',
					closeButtonTooltip: 'Close',
				},
			},
		};

		// Setup localStorage mock
		const localStorageMock = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		};
		Object.defineProperty(window, 'localStorage', {
			value: localStorageMock,
			writable: true,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('sendMessage', () => {
		let chatStore: Chat;

		beforeEach(() => {
			chatStore = setupChatStore(mockOptions);
		});

		it('should send a message without streaming', async () => {
			const mockResponse = { output: 'Hello from bot!' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			await chatStore.sendMessage('Hello bot!');

			expect(api.sendMessage).toHaveBeenCalledWith('Hello bot!', [], null, mockOptions);

			expect(chatStore.messages.value).toHaveLength(2);
			expect(chatStore.messages.value[0]).toMatchObject({
				text: 'Hello bot!',
				sender: 'user',
			});
			expect(chatStore.messages.value[1]).toMatchObject({
				text: 'Hello from bot!',
				sender: 'bot',
			});
		});

		it('should handle empty response gracefully', async () => {
			const mockResponse = {};
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			await chatStore.sendMessage('Hello bot!');

			expect(chatStore.messages.value).toHaveLength(2);
			expect(chatStore.messages.value[1]).toMatchObject({
				text: '',
				sender: 'bot',
			});
		});

		it('should handle response with only text property', async () => {
			const mockResponse = { text: 'Response text' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			await chatStore.sendMessage('Hello bot!');

			expect(chatStore.messages.value[1]).toMatchObject({
				text: 'Response text',
				sender: 'bot',
			});
		});

		it('should handle errors during message sending', async () => {
			vi.mocked(api.sendMessage).mockRejectedValueOnce(new Error('Network error'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await chatStore.sendMessage('Hello bot!');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Chat API error:', expect.any(Error));

			// Error messages should be displayed to the user
			expect(chatStore.messages.value).toHaveLength(2);
			expect(chatStore.messages.value[0]).toMatchObject({
				text: 'Hello bot!',
				sender: 'user',
			});
			expect(chatStore.messages.value[1]).toMatchObject({
				text: 'Error: Failed to receive response',
				sender: 'bot',
			});

			consoleErrorSpy.mockRestore();
		});

		it('should send files with message', async () => {
			const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
			const mockResponse = { output: 'File received!' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			await chatStore.sendMessage('Here is a file', [mockFile]);

			expect(api.sendMessage).toHaveBeenCalledWith('Here is a file', [mockFile], null, mockOptions);

			expect(chatStore.messages.value[0]).toMatchObject({
				text: 'Here is a file',
				sender: 'user',
				files: [mockFile],
			});
		});

		it('should set waitingForResponse correctly', async () => {
			const mockResponse = { output: 'Response' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			expect(chatStore.waitingForResponse.value).toBe(false);

			const sendPromise = chatStore.sendMessage('Test');
			expect(chatStore.waitingForResponse.value).toBe(true);

			await sendPromise;
			expect(chatStore.waitingForResponse.value).toBe(false);
		});

		it('should emit scrollToBottom events', async () => {
			const mockResponse = { output: 'Response' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			await chatStore.sendMessage('Test');

			expect(chatEventBus.emit).toHaveBeenCalledWith('scrollToBottom');
			expect(chatEventBus.emit).toHaveBeenCalledTimes(2); // Once after user message, once after bot response
		});
	});

	describe('streaming', () => {
		let chatStore: Chat;

		beforeEach(() => {
			mockOptions.enableStreaming = true;
			chatStore = setupChatStore(mockOptions);
		});

		it('should handle streaming messages', async () => {
			const mockStreamingResponse = { hasReceivedChunks: true };
			vi.mocked(api.sendMessageStreaming).mockResolvedValueOnce(mockStreamingResponse);

			await chatStore.sendMessage('Stream this!');

			expect(api.sendMessageStreaming).toHaveBeenCalledWith(
				'Stream this!',
				[],
				null,
				mockOptions,
				expect.objectContaining({
					onChunk: expect.any(Function) as StreamingEventHandlers['onChunk'],
					onBeginMessage: expect.any(Function) as StreamingEventHandlers['onBeginMessage'],
					onEndMessage: expect.any(Function) as StreamingEventHandlers['onEndMessage'],
				}),
			);
		});

		it('should handle empty streaming response', async () => {
			const mockStreamingResponse = { hasReceivedChunks: false };
			vi.mocked(api.sendMessageStreaming).mockResolvedValueOnce(mockStreamingResponse);

			await chatStore.sendMessage('Stream this!');

			expect(chatStore.messages.value).toHaveLength(2);
			expect(chatStore.messages.value[1]).toMatchObject({
				text: '[No response received. This could happen if streaming is enabled in the trigger but disabled in agent node(s)]',
				sender: 'bot',
			});
		});

		it('should handle streaming errors', async () => {
			vi.mocked(api.sendMessageStreaming).mockRejectedValueOnce(new Error('Stream error'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await chatStore.sendMessage('Stream this!');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Chat API error:', expect.any(Error));
			expect(chatStore.messages.value[1]).toMatchObject({
				text: 'Error: Failed to receive response',
				sender: 'bot',
			});

			consoleErrorSpy.mockRestore();
		});

		it('should handle streaming with files', async () => {
			const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
			const mockStreamingResponse = { hasReceivedChunks: true };
			vi.mocked(api.sendMessageStreaming).mockResolvedValueOnce(mockStreamingResponse);

			await chatStore.sendMessage('Stream with file', [mockFile]);

			expect(api.sendMessageStreaming).toHaveBeenCalledWith(
				'Stream with file',
				[mockFile],
				null,
				mockOptions,
				expect.objectContaining({
					onChunk: expect.any(Function) as StreamingEventHandlers['onChunk'],
					onBeginMessage: expect.any(Function) as StreamingEventHandlers['onBeginMessage'],
					onEndMessage: expect.any(Function) as StreamingEventHandlers['onEndMessage'],
				}),
			);
		});
	});

	describe('session management', () => {
		let chatStore: Chat;

		beforeEach(() => {
			mockOptions.loadPreviousSession = true;
			chatStore = setupChatStore(mockOptions);
		});

		it('should load previous session', async () => {
			const mockSessionId = 'existing-session';
			const mockMessages: LoadPreviousSessionResponse = {
				data: [
					{
						id: ['HumanMessage-1'], // The implementation expects string but types say array
						kwargs: { content: 'Previous user message', additional_kwargs: {} },
						lc: 1,
						type: 'HumanMessage',
					},
					{
						id: ['AIMessage-1'],
						kwargs: { content: 'Previous bot message', additional_kwargs: {} },
						lc: 1,
						type: 'AIMessage',
					},
				],
			};

			(window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockSessionId);
			vi.mocked(api.loadPreviousSession).mockResolvedValueOnce(mockMessages);

			const sessionId = await chatStore.loadPreviousSession?.();

			expect(sessionId).toBe(mockSessionId);
			expect(api.loadPreviousSession).toHaveBeenCalledWith(mockSessionId, mockOptions);
			expect(chatStore.messages.value).toHaveLength(2);
			expect(chatStore.messages.value[0]).toMatchObject({
				text: 'Previous user message',
				sender: 'bot', // Both will be 'bot' because id is an array, not a string
			});
			expect(chatStore.messages.value[1]).toMatchObject({
				text: 'Previous bot message',
				sender: 'bot',
			});
			expect(chatStore.currentSessionId.value).toBe(mockSessionId);
		});

		it('should create new session if no previous session exists', async () => {
			(window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
			vi.mocked(api.loadPreviousSession).mockResolvedValueOnce({ data: [] });

			const sessionId = await chatStore.loadPreviousSession?.();

			expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			expect(chatStore.messages.value).toHaveLength(0);
			expect(chatStore.currentSessionId.value).toBeNull();
		});

		it('should skip loading if loadPreviousSession is false', async () => {
			mockOptions.loadPreviousSession = false;
			chatStore = setupChatStore(mockOptions);

			const result = await chatStore.loadPreviousSession?.();

			expect(result).toBeUndefined();
			expect(api.loadPreviousSession).not.toHaveBeenCalled();
		});

		it('should start a new session', async () => {
			await chatStore.startNewSession?.();

			expect(chatStore.currentSessionId.value).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(window.localStorage.setItem).toHaveBeenCalledWith(
				localStorageSessionIdKey,
				chatStore.currentSessionId.value,
			);
		});
	});

	describe('initial messages', () => {
		it('should compute initial messages from options', () => {
			mockOptions.initialMessages = ['Welcome!', 'How can I help you?'];
			const chatStore = setupChatStore(mockOptions);

			expect(chatStore.initialMessages.value).toHaveLength(2);
			expect(chatStore.initialMessages.value[0]).toMatchObject({
				text: 'Welcome!',
				sender: 'bot',
			});
			expect(chatStore.initialMessages.value[1]).toMatchObject({
				text: 'How can I help you?',
				sender: 'bot',
			});
		});

		it('should handle undefined initial messages', () => {
			const chatStore = setupChatStore(mockOptions);

			expect(chatStore.initialMessages.value).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		let chatStore: Chat;

		beforeEach(() => {
			chatStore = setupChatStore(mockOptions);
		});

		it('should handle sending message with null session ID', async () => {
			const mockResponse = { output: 'Response' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			chatStore.currentSessionId.value = null;
			await chatStore.sendMessage('Test');

			expect(api.sendMessage).toHaveBeenCalledWith('Test', [], null, mockOptions);
		});

		it('should handle empty text message', async () => {
			const mockResponse = { output: 'Response' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			await chatStore.sendMessage('');

			expect(chatStore.messages.value[0]).toMatchObject({
				text: '',
				sender: 'user',
			});
		});

		it('should handle streaming with existing bot messages', async () => {
			mockOptions.enableStreaming = true;
			chatStore = setupChatStore(mockOptions);

			// Add an existing bot message
			chatStore.messages.value.push({
				id: 'existing',
				text: 'Existing message',
				sender: 'bot',
			});

			const mockStreamingResponse = { hasReceivedChunks: false };
			vi.mocked(api.sendMessageStreaming).mockResolvedValueOnce(mockStreamingResponse);

			await chatStore.sendMessage('Test');

			// Should still add error message even with existing bot messages
			const lastMessage = chatStore.messages.value[chatStore.messages.value.length - 1];
			assert(lastMessage.type === 'text');
			expect(lastMessage.text).toBe(
				'[No response received. This could happen if streaming is enabled in the trigger but disabled in agent node(s)]',
			);
		});

		it('should return response when executionStarted is true', async () => {
			const mockResponse = {
				executionStarted: true,
				executionId: '12345',
			};
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			const result = await chatStore.sendMessage('Execute workflow');

			expect(result).toEqual(mockResponse);
			// Should only have the user message, no bot response
			expect(chatStore.messages.value).toHaveLength(1);
			expect(chatStore.messages.value[0]).toMatchObject({
				text: 'Execute workflow',
				sender: 'user',
			});
		});

		it('should handle message field in response', async () => {
			const mockResponse = { message: 'Response from message field' };
			vi.mocked(api.sendMessage).mockResolvedValueOnce(mockResponse);

			await chatStore.sendMessage('Test message field');

			expect(chatStore.messages.value[1]).toMatchObject({
				text: 'Response from message field',
				sender: 'bot',
			});
		});
	});
});
