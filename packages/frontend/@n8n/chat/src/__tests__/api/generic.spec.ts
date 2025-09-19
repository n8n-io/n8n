import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postWithFiles } from '@n8n/chat/api/generic';

describe('postWithFiles', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('should properly serialize object metadata to JSON string in FormData', async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => await Promise.resolve({ success: true }),
			text: async () => await Promise.resolve('success'),
			clone: () => mockResponse,
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
		const metadata = {
			userId: 'user-123',
			token: 'abc-def-ghi',
			nested: {
				prop: 'value',
				num: 42,
			},
		};

		await postWithFiles(
			'https://example.com/webhook',
			{
				action: 'sendMessage',
				sessionId: 'test-session',
				chatInput: 'test message',
				metadata,
			},
			[testFile],
		);

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com/webhook', {
			method: 'POST',
			body: expect.any(FormData),
			mode: 'cors',
			cache: 'no-cache',
			headers: {},
		});

		// Get the FormData from the call
		const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
		expect(formData).toBeInstanceOf(FormData);

		// Verify that metadata was properly serialized as JSON, not "[object Object]"
		const metadataValue = formData.get('metadata');
		expect(metadataValue).toBe(JSON.stringify(metadata));

		// Verify other fields are still strings
		expect(formData.get('action')).toBe('sendMessage');
		expect(formData.get('sessionId')).toBe('test-session');
		expect(formData.get('chatInput')).toBe('test message');

		// Verify file was included
		expect(formData.get('files')).toBe(testFile);
	});

	it('should handle primitive values correctly', async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => await Promise.resolve({ success: true }),
			text: async () => await Promise.resolve('success'),
			clone: () => mockResponse,
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await postWithFiles('https://example.com/webhook', {
			stringValue: 'test',
		});

		const formData = fetchSpy.mock.calls[0][1]?.body as FormData;

		expect(formData.get('stringValue')).toBe('test');
	});

	it('should handle arrays as JSON strings', async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => await Promise.resolve({ success: true }),
			text: async () => await Promise.resolve('success'),
			clone: () => mockResponse,
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		const arrayValue = ['item1', 'item2', { nested: 'object' }];

		await postWithFiles('https://example.com/webhook', {
			arrayValue,
		});

		const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
		expect(formData.get('arrayValue')).toBe(JSON.stringify(arrayValue));
	});

	it('should handle empty objects correctly', async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			json: async () => await Promise.resolve({ success: true }),
			text: async () => await Promise.resolve('success'),
			clone: () => mockResponse,
		} as Response;

		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

		await postWithFiles('https://example.com/webhook', {
			emptyObject: {},
		});

		const formData = fetchSpy.mock.calls[0][1]?.body as FormData;
		expect(formData.get('emptyObject')).toBe('{}');
	});
});
