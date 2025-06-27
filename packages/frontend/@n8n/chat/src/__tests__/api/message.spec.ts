import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendMessageStreaming } from '@n8n/chat/api';
import type { ChatOptions } from '@n8n/chat/types';

describe('sendMessageStreaming', () => {
	const mockOptions: ChatOptions = {
		webhookUrl: 'https://test.example.com/webhook',
		chatSessionKey: 'sessionId',
		chatInputKey: 'chatInput',
		i18n: {
			en: {
				title: 'Test',
				subtitle: 'Test',
				footer: 'Test',
				getStarted: 'Test',
				inputPlaceholder: 'Test',
				closeButtonTooltip: 'Test',
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should call the webhook URL with correct parameters', async () => {
		const chunks = [
			{ type: 'begin' },
			{ type: 'progress', output: 'Hello ' },
			{ type: 'progress', output: 'World!' },
			{ type: 'end' },
		];

		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				chunks.forEach((chunk) => {
					const data = JSON.stringify(chunk) + '\n';
					controller.enqueue(encoder.encode(data));
				});
				controller.close();
			},
		});

		const mockResponse = {
			ok: true,
			status: 200,
			body: stream,
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		const onChunk = vi.fn();
		const onBeginMessage = vi.fn();
		const onEndMessage = vi.fn();

		await sendMessageStreaming(
			'Test message',
			[],
			'test-session-id',
			mockOptions,
			onChunk,
			onBeginMessage,
			onEndMessage,
		);

		expect(fetchSpy).toHaveBeenCalledWith('https://test.example.com/webhook', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				action: 'sendMessage',
				sessionId: 'test-session-id',
				chatInput: 'Test message',
			}),
		});

		expect(onBeginMessage).toHaveBeenCalledTimes(1);
		expect(onChunk).toHaveBeenCalledTimes(2);
		expect(onChunk).toHaveBeenCalledWith('Hello ');
		expect(onChunk).toHaveBeenCalledWith('World!');
		expect(onEndMessage).toHaveBeenCalledTimes(1);
	});

	it('should reject file uploads', async () => {
		const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

		await expect(
			sendMessageStreaming(
				'Test message',
				[testFile],
				'test-session-id',
				mockOptions,
				vi.fn(),
				vi.fn(),
				vi.fn(),
			),
		).rejects.toThrow('File uploads are not supported with streaming responses');
	});

	it('should handle HTTP errors', async () => {
		const mockResponse = {
			ok: false,
			status: 500,
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await expect(
			sendMessageStreaming(
				'Test message',
				[],
				'test-session-id',
				mockOptions,
				vi.fn(),
				vi.fn(),
				vi.fn(),
			),
		).rejects.toThrow('HTTP error! status: 500');
	});

	it('should handle missing response body', async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			body: null,
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await expect(
			sendMessageStreaming(
				'Test message',
				[],
				'test-session-id',
				mockOptions,
				vi.fn(),
				vi.fn(),
				vi.fn(),
			),
		).rejects.toThrow('Response body is not readable');
	});

	it('should include custom headers from webhook config', async () => {
		const optionsWithHeaders: ChatOptions = {
			...mockOptions,
			webhookConfig: {
				headers: {
					Authorization: 'Bearer token',
					'X-Custom-Header': 'value',
				},
			},
		};

		const chunks = [{ type: 'begin' }, { type: 'end' }];
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				chunks.forEach((chunk) => {
					const data = JSON.stringify(chunk) + '\n';
					controller.enqueue(encoder.encode(data));
				});
				controller.close();
			},
		});

		const mockResponse = {
			ok: true,
			status: 200,
			body: stream,
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessageStreaming(
			'Test message',
			[],
			'test-session-id',
			optionsWithHeaders,
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		expect(fetchSpy).toHaveBeenCalledWith('https://test.example.com/webhook', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer token',
				'X-Custom-Header': 'value',
			},
			body: JSON.stringify({
				action: 'sendMessage',
				sessionId: 'test-session-id',
				chatInput: 'Test message',
			}),
		});
	});

	it('should include metadata when provided', async () => {
		const optionsWithMetadata: ChatOptions = {
			...mockOptions,
			metadata: {
				userId: 'user-123',
				source: 'chat-widget',
			},
		};

		const chunks = [{ type: 'begin' }, { type: 'end' }];
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				chunks.forEach((chunk) => {
					const data = JSON.stringify(chunk) + '\n';
					controller.enqueue(encoder.encode(data));
				});
				controller.close();
			},
		});

		const mockResponse = {
			ok: true,
			status: 200,
			body: stream,
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessageStreaming(
			'Test message',
			[],
			'test-session-id',
			optionsWithMetadata,
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		expect(fetchSpy).toHaveBeenCalledWith('https://test.example.com/webhook', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				action: 'sendMessage',
				sessionId: 'test-session-id',
				chatInput: 'Test message',
				metadata: {
					userId: 'user-123',
					source: 'chat-widget',
				},
			}),
		});
	});
});
