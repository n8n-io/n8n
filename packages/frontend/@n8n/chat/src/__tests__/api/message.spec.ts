import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendMessage, sendMessageStreaming } from '@n8n/chat/api';
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

	it('should strip Content-Type header when uploading files even if set in webhookConfig', async () => {
		const optionsWithContentType: ChatOptions = {
			...mockOptions,
			webhookConfig: {
				headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
			},
		};

		const mockResponse = {
			ok: true,
			status: 200,
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('{"type":"end"}\n'));
					controller.close();
				},
			}),
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessageStreaming(
			'test',
			[new File([''], 'test.txt')],
			'session',
			optionsWithContentType,
			{
				onChunk: vi.fn(),
				onEndMessage: vi.fn(),
				onBeginMessage: vi.fn(),
			},
		);

		// Content-Type must be excluded for FormData (browser sets it with boundary)
		// Other custom headers should still be included
		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: { Accept: 'text/plain', 'X-Custom': 'value' },
				body: expect.any(FormData),
			}),
		);
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

	describe('beforeMessageSent and afterMessageSent hooks', () => {
		it('should call beforeMessageSent before sending message', async () => {
			const beforeMessageSent = vi.fn();
			const optionsWithHook: ChatOptions = {
				...mockOptions,
				beforeMessageSent,
			};

			const chunks = [
				{
					type: 'begin',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
				},
				{
					type: 'end',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
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

			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

			await sendMessageStreaming('Test message', [], 'test-session-id', optionsWithHook, {
				onChunk: vi.fn(),
				onEndMessage: vi.fn(),
				onBeginMessage: vi.fn(),
			});

			expect(beforeMessageSent).toHaveBeenCalledWith('Test message');
			expect(beforeMessageSent).toHaveBeenCalledBefore(fetchSpy);
		});

		it('should call afterMessageSent after streaming completes', async () => {
			const afterMessageSent = vi.fn();
			const optionsWithHook: ChatOptions = {
				...mockOptions,
				afterMessageSent,
			};

			const chunks = [
				{
					type: 'begin',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
				},
				{
					type: 'item',
					content: 'Hello',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
				},
				{
					type: 'end',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
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

			await sendMessageStreaming('Test message', [], 'test-session-id', optionsWithHook, {
				onChunk: vi.fn(),
				onEndMessage: vi.fn(),
				onBeginMessage: vi.fn(),
			});

			expect(afterMessageSent).toHaveBeenCalledWith('Test message', { hasReceivedChunks: true });
		});

		it('should support async onEndMessage handler', async () => {
			const onEndMessage = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			const chunks = [
				{
					type: 'begin',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
				},
				{
					type: 'end',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
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

			await sendMessageStreaming('Test message', [], 'test-session-id', mockOptions, {
				onChunk: vi.fn(),
				onEndMessage,
				onBeginMessage: vi.fn(),
			});

			expect(onEndMessage).toHaveBeenCalledWith('node-1', undefined);
		});

		it('should await async onEndMessage on error chunks', async () => {
			const onEndMessage = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			const chunks = [
				{
					type: 'begin',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
				},
				{
					type: 'error',
					content: 'Something went wrong',
					metadata: { nodeId: 'node-1', nodeName: 'Test Node', timestamp: Date.now() },
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
			await sendMessageStreaming('Test message', [], 'test-session-id', mockOptions, {
				onChunk,
				onEndMessage,
				onBeginMessage: vi.fn(),
			});

			expect(onChunk).toHaveBeenCalledWith('Error: Something went wrong', 'node-1', undefined);
			expect(onEndMessage).toHaveBeenCalledWith('node-1', undefined);
		});
	});
});

describe('sendMessage', () => {
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

	it('should call beforeMessageSent hook before sending', async () => {
		const beforeMessageSent = vi.fn();
		const optionsWithHook: ChatOptions = {
			...mockOptions,
			webhookConfig: { method: 'POST' },
			beforeMessageSent,
		};

		const mockResponseData = { output: 'Response' };
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => mockResponseData,
			clone: () => mockResponse,
			text: async () => JSON.stringify(mockResponseData),
			headers: new Headers(),
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessage('Test message', [], 'test-session-id', optionsWithHook);

		expect(beforeMessageSent).toHaveBeenCalledWith('Test message');
		expect(beforeMessageSent).toHaveBeenCalledBefore(fetchSpy);
	});

	it('should call afterMessageSent hook after sending', async () => {
		const afterMessageSent = vi.fn();
		const optionsWithHook: ChatOptions = {
			...mockOptions,
			webhookConfig: { method: 'POST' },
			afterMessageSent,
		};

		const mockResponseData = { output: 'Response' };
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => mockResponseData,
			clone: () => mockResponse,
			text: async () => JSON.stringify(mockResponseData),
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessage('Test message', [], 'test-session-id', optionsWithHook);

		expect(afterMessageSent).toHaveBeenCalledWith('Test message', mockResponseData);
	});

	it('should handle file uploads with beforeMessageSent', async () => {
		const beforeMessageSent = vi.fn();
		const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
		const optionsWithHook: ChatOptions = {
			...mockOptions,
			beforeMessageSent,
		};

		const mockResponseData = { output: 'File received' };
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => mockResponseData,
			clone: () => mockResponse,
			text: async () => JSON.stringify(mockResponseData),
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessage('Test message', [testFile], 'test-session-id', optionsWithHook);

		expect(beforeMessageSent).toHaveBeenCalledWith('Test message');
	});

	it('should call hooks in correct order', async () => {
		const callOrder: string[] = [];
		const beforeMessageSent = vi.fn(() => {
			callOrder.push('before');
		});
		const afterMessageSent = vi.fn(() => {
			callOrder.push('after');
		});

		const optionsWithHooks: ChatOptions = {
			...mockOptions,
			webhookConfig: { method: 'POST' },
			beforeMessageSent,
			afterMessageSent,
		};

		const mockResponseData = { output: 'Response' };
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => mockResponseData,
			clone: () => mockResponse,
			text: async () => JSON.stringify(mockResponseData),
			headers: new Headers(),
		} as Response;

		vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await sendMessage('Test message', [], 'test-session-id', optionsWithHooks);

		expect(callOrder).toEqual(['before', 'after']);
	});
});
