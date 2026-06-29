import { getProxyAgent } from '@n8n/ai-utilities';
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import OpenAI from 'openai';
import type { Mocked, MockedClass } from 'vitest';

import { searchModels } from '../loadModels';

vi.mock('openai');
vi.mock('@n8n/ai-utilities');

const mockedGetProxyAgent = vi.mocked(getProxyAgent);

const JWT_ACCOUNT_CLAIM = 'https://api.openai.com/auth';

function makeOpenAiAccountToken(accountId: string) {
	const payload = Buffer.from(
		JSON.stringify({ [JWT_ACCOUNT_CLAIM]: { chatgpt_account_id: accountId } }),
	).toString('base64url');

	return `header.${payload}.signature`;
}

describe('searchModels', () => {
	let mockContext: Mocked<ILoadOptionsFunctions>;
	let mockOpenAI: Mocked<typeof OpenAI>;

	beforeEach(() => {
		mockedGetProxyAgent.mockReturnValue({} as never);
		mockContext = {
			getCredentials: vi.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			getNodeParameter: vi.fn().mockReturnValue(''),
		} as unknown as Mocked<ILoadOptionsFunctions>;

		// Setup OpenAI mock with required properties
		const mockOpenAIInstance = {
			apiKey: 'test-api-key',
			organization: null,
			project: null,
			_options: {},
			models: {
				list: vi.fn().mockResolvedValue({
					data: [
						{ id: 'gpt-4' },
						{ id: 'gpt-3.5-turbo' },
						{ id: 'gpt-3.5-turbo-instruct' },
						{ id: 'ft:gpt-3.5-turbo' },
						{ id: 'o1-model' },
						{ id: 'whisper-1' },
						{ id: 'davinci-instruct-beta' },
						{ id: 'computer-use-preview' },
						{ id: 'whisper-1-preview' },
						{ id: 'tts-model' },
						{ id: 'other-model' },
					],
				}),
			},
		} as unknown as OpenAI;

		(OpenAI as MockedClass<typeof OpenAI>).mockImplementation(function () {
			return mockOpenAIInstance;
		});

		mockOpenAI = OpenAI as Mocked<typeof OpenAI>;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('should return filtered models if custom API endpoint is not provided', async () => {
		const result = await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://api.openai.com/v1',
				apiKey: 'test-api-key',
			}),
		);
		expect(result.results).toEqual([
			{ name: 'ft:gpt-3.5-turbo', value: 'ft:gpt-3.5-turbo' },
			{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
			{ name: 'gpt-4', value: 'gpt-4' },
			{ name: 'o1-model', value: 'o1-model' },
			{ name: 'other-model', value: 'other-model' },
		]);
	});

	it('should initialize OpenAI with correct credentials', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://test-url.com',
		});
		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://test-url.com',
				apiKey: 'test-api-key',
			}),
		);
	});

	it('should fetch Codex account models with OAuth token-backed credentials', async () => {
		const accessToken = makeOpenAiAccountToken('account-id');
		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				models: [
					{ slug: 'hidden-model', visibility: 'hidden', priority: 1 },
					{ slug: 'gpt-5.4-mini', visibility: 'list', priority: 2 },
					{ slug: 'gpt-5.4', visibility: 'list', priority: 1 },
				],
			}),
		} as Response);
		mockContext.getCredentials.mockResolvedValueOnce({
			oauthTokenData: {
				access_token: accessToken,
			},
			url: 'https://test-url.com',
		});
		mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
			if (parameterName === 'authentication') return 'oAuth2';
			return '';
		});

		const result = await searchModels.call(mockContext);

		expect(mockContext.getCredentials).toHaveBeenCalledWith('openAiOAuth2Api');
		expect(mockOpenAI).not.toHaveBeenCalled();
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://chatgpt.com/backend-api/codex/models?client_version=1.0.0',
			{
				headers: expect.objectContaining({
					Authorization: `Bearer ${accessToken}`,
					'chatgpt-account-id': 'account-id',
				}),
				dispatcher: {},
			},
		);
		expect(mockedGetProxyAgent).toHaveBeenCalledWith(
			'https://chatgpt.com/backend-api/codex/models?client_version=1.0.0',
		);
		expect(result.results).toEqual([
			{ name: 'gpt-5.4', value: 'gpt-5.4' },
			{ name: 'gpt-5.4-mini', value: 'gpt-5.4-mini' },
		]);
	});

	it('should use default OpenAI URL if no custom URL provided', async () => {
		mockContext.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});

		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://api.openai.com/v1',
				apiKey: 'test-api-key',
			}),
		);
	});

	it('should include all models for custom API endpoints', async () => {
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://custom-api.com');

		const result = await searchModels.call(mockContext);
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

		expect(result.results).toEqual([
			{ name: 'ft:gpt-3.5-turbo', value: 'ft:gpt-3.5-turbo' },
			{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
			{ name: 'gpt-4', value: 'gpt-4' },
			{ name: 'o1-model', value: 'o1-model' },
			{ name: 'other-model', value: 'other-model' },
		]);
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

	it('should include custom credential headers in the OpenAI client', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			header: true,
			headerName: 'X-Custom-Auth',
			headerValue: 'custom-value',
		});

		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultHeaders: expect.objectContaining({
					'X-Custom-Auth': 'custom-value',
				}),
			}),
		);
	});

	it('should return models sorted alphabetically by id', async () => {
		// Setup a mock with scrambled order
		const mockUnsortedInstance = {
			apiKey: 'test-api-key',
			models: {
				list: vi.fn().mockResolvedValue({
					data: [
						{ id: 'gpt-4' },
						{ id: 'a-model' },
						{ id: 'o1-model' },
						{ id: 'gpt-3.5-turbo' },
						{ id: 'z-model' },
					],
				}),
			},
		} as unknown as OpenAI;

		(OpenAI as MockedClass<typeof OpenAI>).mockImplementation(function () {
			return mockUnsortedInstance;
		});

		// Custom API endpoint to include all models
		mockContext.getNodeParameter = vi.fn().mockReturnValue('https://custom-api.com');

		const result = await searchModels.call(mockContext);

		// Verify the results are sorted alphabetically
		expect(result.results).toEqual([
			{ name: 'a-model', value: 'a-model' },
			{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
			{ name: 'gpt-4', value: 'gpt-4' },
			{ name: 'o1-model', value: 'o1-model' },
			{ name: 'z-model', value: 'z-model' },
		]);
	});
});
