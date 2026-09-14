import { proxyFetch } from '@n8n/ai-utilities';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { searchModels } from '../loadModels';

vi.mock('@n8n/ai-utilities', () => ({
	proxyFetch: vi.fn(),
}));

const MODEL_IDS = [
	'gpt-4',
	'gpt-3.5-turbo',
	'gpt-3.5-turbo-instruct',
	'ft:gpt-3.5-turbo',
	'o1-model',
	'whisper-1',
	'davinci-instruct-beta',
	'computer-use-preview',
	'whisper-1-preview',
	'tts-model',
	'other-model',
];

const OFFICIAL_API_RESULTS = [
	{ name: 'ft:gpt-3.5-turbo', value: 'ft:gpt-3.5-turbo' },
	{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
	{ name: 'gpt-4', value: 'gpt-4' },
	{ name: 'o1-model', value: 'o1-model' },
	{ name: 'other-model', value: 'other-model' },
];

describe('searchModels', () => {
	let mockContext: Mocked<ILoadOptionsFunctions>;
	let fetchSpy: ReturnType<typeof vi.fn>;
	const secureLookup = vi.fn();

	beforeEach(() => {
		mockContext = {
			getCredentials: vi.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			getNodeParameter: vi.fn().mockReturnValue(''),
			getNode: vi.fn().mockReturnValue({
				id: '1',
				name: 'Test Node',
				type: 'test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INode),
			helpers: {
				getSecureEgressFilter: vi.fn().mockReturnValue({
					validateUrl: vi.fn(),
					createSecureLookup: vi.fn().mockReturnValue(secureLookup),
				}),
			},
		} as unknown as Mocked<ILoadOptionsFunctions>;

		fetchSpy = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ data: MODEL_IDS.map((id) => ({ id })) }),
			text: async () => '',
		});
		vi.mocked(proxyFetch).mockImplementation(
			fetchSpy as unknown as typeof import('@n8n/ai-utilities')['proxyFetch'],
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('should return filtered models if custom API endpoint is not provided', async () => {
		const result = await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith({
			input: 'https://api.openai.com/v1/models',
			init: expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer test-api-key' }),
			}),
			lookup: secureLookup,
		});
		expect(result.results).toEqual(OFFICIAL_API_RESULTS);
	});

	it('should use the credential url as the API base', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://test-url.com',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ input: 'https://test-url.com/models' }),
		);
	});

	it('should use default OpenAI URL if no custom URL provided', async () => {
		mockContext.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ input: 'https://api.openai.com/v1/models' }),
		);
	});

	it('should include all models for custom API endpoints', async () => {
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://custom-api.com');

		const result = await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ input: 'https://custom-api.com/models' }),
		);
		expect(result.results).toEqual([
			{ name: 'computer-use-preview', value: 'computer-use-preview' },
			{ name: 'davinci-instruct-beta', value: 'davinci-instruct-beta' },
			{ name: 'ft:gpt-3.5-turbo', value: 'ft:gpt-3.5-turbo' },
			{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
			{ name: 'gpt-3.5-turbo-instruct', value: 'gpt-3.5-turbo-instruct' },
			{ name: 'gpt-4', value: 'gpt-4' },
			{ name: 'o1-model', value: 'o1-model' },
			{ name: 'other-model', value: 'other-model' },
			{ name: 'tts-model', value: 'tts-model' },
			{ name: 'whisper-1', value: 'whisper-1' },
			{ name: 'whisper-1-preview', value: 'whisper-1-preview' },
		]);
		expect(result.results).toHaveLength(11);
	});

	it('should treat ai-assistant.n8n.io as official API', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://ai-assistant.n8n.io/v1',
		});

		const result = await searchModels.call(mockContext);

		expect(result.results).toEqual(OFFICIAL_API_RESULTS);
	});

	it('should filter models based on search term', async () => {
		const result = await searchModels.call(mockContext, 'gpt');

		expect(result.results).toEqual([
			{ name: 'ft:gpt-3.5-turbo', value: 'ft:gpt-3.5-turbo' },
			{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
			{ name: 'gpt-4', value: 'gpt-4' },
		]);
	});

	it('should handle case-insensitive search', async () => {
		const result = await searchModels.call(mockContext, 'GPT');

		expect(result.results).toEqual([
			{ name: 'ft:gpt-3.5-turbo', value: 'ft:gpt-3.5-turbo' },
			{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
			{ name: 'gpt-4', value: 'gpt-4' },
		]);
	});

	it('should reject a base URL override that the credential does not allow', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://api.openai.com/v1',
			allowedHttpRequestDomains: 'none',
		});
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://custom-api.com/v1');

		await expect(searchModels.call(mockContext)).rejects.toThrow(NodeOperationError);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('should allow a base URL override matching the credential URL', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://api.openai.com/v1',
			allowedHttpRequestDomains: 'none',
		});
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://api.openai.com/v1');

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ input: 'https://api.openai.com/v1/models' }),
		);
	});

	it('should reject a base URL override outside the allowed domains list', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'example.com',
		});
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://custom-api.com/v1');

		await expect(searchModels.call(mockContext)).rejects.toThrow(NodeOperationError);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('should allow a base URL override within the allowed domains list', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'example.com',
		});
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://example.com/v1');

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ input: 'https://example.com/v1/models' }),
		);
	});

	it('should not restrict the credential URL when no override is set', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://my-proxy.internal/v1',
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'example.com',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ input: 'https://my-proxy.internal/v1/models' }),
		);
	});

	it('should include custom credential headers in the request', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			header: true,
			headerName: 'X-Custom-Auth',
			headerValue: 'custom-value',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				input: 'https://api.openai.com/v1/models',
				init: expect.objectContaining({
					headers: expect.objectContaining({ 'X-Custom-Auth': 'custom-value' }),
				}),
			}),
		);
	});
});
