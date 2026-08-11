import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { searchModels } from '../loadModels';

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

	beforeEach(() => {
		mockContext = {
			getCredentials: vi.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			getNodeParameter: vi.fn().mockReturnValue(''),
		} as unknown as Mocked<ILoadOptionsFunctions>;

		fetchSpy = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ data: MODEL_IDS.map((id) => ({ id })) }),
			text: async () => '',
		});
		vi.stubGlobal('fetch', fetchSpy);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('should return filtered models if custom API endpoint is not provided', async () => {
		const result = await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.openai.com/v1/models',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer test-api-key' }),
			}),
		);
		expect(result.results).toEqual(OFFICIAL_API_RESULTS);
	});

	it('should use the credential url as the API base', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://test-url.com',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith('https://test-url.com/models', expect.anything());
	});

	it('should use default OpenAI URL if no custom URL provided', async () => {
		mockContext.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.anything());
	});

	it('should include all models for custom API endpoints', async () => {
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://custom-api.com');

		const result = await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith('https://custom-api.com/models', expect.anything());
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

	it('should include custom credential headers in the request', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			header: true,
			headerName: 'X-Custom-Auth',
			headerValue: 'custom-value',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.openai.com/v1/models',
			expect.objectContaining({
				headers: expect.objectContaining({ 'X-Custom-Auth': 'custom-value' }),
			}),
		);
	});
});
