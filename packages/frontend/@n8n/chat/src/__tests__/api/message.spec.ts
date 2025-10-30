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
		vi.restoreAllMocks();
	});

	it('should call the webhook URL with correct parameters', async () => {
		const chunks = [
			{
				type: 'begin',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'item',
				content: 'Hello ',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'item',
				content: 'World!',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'end',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
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
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		const onChunk = vi.fn();
		const onBeginMessage = vi.fn();
		const onEndMessage = vi.fn();

		await sendMessageStreaming('Test message', [], 'test-session-id', mockOptions, {
			onChunk,
			onBeginMessage,
			onEndMessage,
		});

		expect(fetch).toHaveBeenCalledWith('https://test.example.com/webhook', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/plain',
			},
			body: JSON.stringify({
				action: 'sendMessage',
				sessionId: 'test-session-id',
				chatInput: 'Test message',
			}),
		});

		expect(onBeginMessage).toHaveBeenCalledTimes(1);
		expect(onBeginMessage).toHaveBeenCalledWith('node-1', 0);
		expect(onChunk).toHaveBeenCalledTimes(2);
		expect(onChunk).toHaveBeenCalledWith('Hello ', 'node-1', 0);
		expect(onChunk).toHaveBeenCalledWith('World!', 'node-1', 0);
		expect(onEndMessage).toHaveBeenCalledTimes(1);
		expect(onEndMessage).toHaveBeenCalledWith('node-1', 0);
	});

	it('should handle multiple runs and items correctly', async () => {
		const chunks = [
			{
				type: 'begin',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'item',
				content: 'Run 0 Item 0 ',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'end',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'begin',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 1,
					itemIndex: 0,
				},
			},
			{
				type: 'item',
				content: 'Run 1 Item 0 ',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 1,
					itemIndex: 0,
				},
			},
			{
				type: 'end',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 1,
					itemIndex: 0,
				},
			},
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
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		const onChunk = vi.fn();
		const onBeginMessage = vi.fn();
		const onEndMessage = vi.fn();

		await sendMessageStreaming('Test message', [], 'test-session-id', mockOptions, {
			onChunk,
			onBeginMessage,
			onEndMessage,
		});

		expect(onBeginMessage).toHaveBeenCalledTimes(2);
		expect(onBeginMessage).toHaveBeenCalledWith('node-1', 0);
		expect(onBeginMessage).toHaveBeenCalledWith('node-1', 1);
		expect(onChunk).toHaveBeenCalledTimes(2);
		expect(onChunk).toHaveBeenCalledWith('Run 0 Item 0 ', 'node-1', 0);
		expect(onChunk).toHaveBeenCalledWith('Run 1 Item 0 ', 'node-1', 1);
		expect(onEndMessage).toHaveBeenCalledTimes(2);
		expect(onEndMessage).toHaveBeenCalledWith('node-1', 0);
		expect(onEndMessage).toHaveBeenCalledWith('node-1', 1);
	});

	it('should support file uploads with streaming', async () => {
		const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

		const chunks = [
			{
				type: 'begin',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'item',
				content: 'File processed: ',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'item',
				content: 'test.txt',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
			{
				type: 'end',
				metadata: {
					nodeId: 'node-1',
					nodeName: 'Test Node',
					timestamp: Date.now(),
					runIndex: 0,
					itemIndex: 0,
				},
			},
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
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		const onChunk = vi.fn();
		const onBeginMessage = vi.fn();
		const onEndMessage = vi.fn();

		await sendMessageStreaming('Test message', [testFile], 'test-session-id', mockOptions, {
			onChunk,
			onBeginMessage,
			onEndMessage,
		});

		// Verify FormData was used for file upload
		expect(fetch).toHaveBeenCalledWith('https://test.example.com/webhook', {
			method: 'POST',
			headers: {
				Accept: 'text/plain',
			},
			body: expect.any(FormData),
		});

		expect(onBeginMessage).toHaveBeenCalledTimes(1);
		expect(onBeginMessage).toHaveBeenCalledWith('node-1', 0);
		expect(onChunk).toHaveBeenCalledTimes(2);
		expect(onChunk).toHaveBeenCalledWith('File processed: ', 'node-1', 0);
		expect(onChunk).toHaveBeenCalledWith('test.txt', 'node-1', 0);
		expect(onEndMessage).toHaveBeenCalledTimes(1);
		expect(onEndMessage).toHaveBeenCalledWith('node-1', 0);
	});

	it('should handle HTTP errors', async () => {
		const mockResponse = {
			ok: false,
			status: 500,
			headers: new Headers(),
			text: async () => 'Internal Server Error',
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await expect(
			sendMessageStreaming('Test message', [], 'test-session-id', mockOptions, {
				onChunk: vi.fn(),
				onEndMessage: vi.fn(),
				onBeginMessage: vi.fn(),
			}),
		).rejects.toThrow('Error while sending message. Error: Internal Server Error');
	});

	it('should handle missing response body', async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			body: null,
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await expect(
			sendMessageStreaming('Test message', [], 'test-session-id', mockOptions, {
				onChunk: vi.fn(),
				onEndMessage: vi.fn(),
				onBeginMessage: vi.fn(),
			}),
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

		const chunks = [
			{
				type: 'begin',
				metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
			},
			{ type: 'end', metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() } },
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
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessageStreaming('Test message', [], 'test-session-id', optionsWithHeaders, {
			onChunk: vi.fn(),
			onEndMessage: vi.fn(),
			onBeginMessage: vi.fn(),
		});

		expect(fetch).toHaveBeenCalledWith('https://test.example.com/webhook', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/plain',
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

		const chunks = [
			{
				type: 'begin',
				metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
			},
			{ type: 'end', metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() } },
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
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessageStreaming('Test message', [], 'test-session-id', optionsWithMetadata, {
			onChunk: vi.fn(),
			onEndMessage: vi.fn(),
			onBeginMessage: vi.fn(),
		});

		expect(fetch).toHaveBeenCalledWith('https://test.example.com/webhook', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/plain',
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
