import type { ILoadOptionsFunctions } from 'n8n-workflow';
import OpenAI from 'openai';

import { searchModels } from '../loadModels';

jest.mock('openai');

describe('searchModels', () => {
	let mockContext: jest.Mocked<ILoadOptionsFunctions>;
	let mockOpenAI: jest.Mocked<typeof OpenAI>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
			}),
			getNodeParameter: jest.fn().mockReturnValue(''),
		} as unknown as jest.Mocked<ILoadOptionsFunctions>;

		// Setup OpenAI mock with required properties
		const mockOpenAIInstance = {
			apiKey: 'test-api-key',
			organization: null,
			project: null,
			_options: {},
			models: {
				list: jest.fn().mockResolvedValue({
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

		(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIInstance);

		mockOpenAI = OpenAI as jest.Mocked<typeof OpenAI>;
	});

	afterEach(() => {
		jest.clearAllMocks();
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

	it('should use default OpenAI URL if no custom URL provided', async () => {
		mockContext.getCredentials = jest.fn().mockResolvedValue({
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
		mockContext.getNodeParameter = jest.fn().mockReturnValue('https://custom-api.com');

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

	it('should return models sorted alphabetically by id', async () => {
		// Setup a mock with scrambled order
		const mockUnsortedInstance = {
			apiKey: 'test-api-key',
			models: {
				list: jest.fn().mockResolvedValue({
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

		(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockUnsortedInstance);

		// Custom API endpoint to include all models
		mockContext.getNodeParameter = jest.fn().mockReturnValue('https://custom-api.com');

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
