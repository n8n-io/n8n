import type { ILoadOptionsFunctions } from 'n8n-workflow';
import OpenAI from 'openai';

import { searchModels } from '../loadModels';

jest.mock('openai');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

describe('searchModels', () => {
	let mockContext: jest.Mocked<ILoadOptionsFunctions>;
	let mockOpenAI: jest.Mocked<typeof OpenAI>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://test-truefoundry.com/v1',
			}),
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
						{ id: 'openai/gpt-4' },
						{ id: 'openai/gpt-3.5-turbo' },
						{ id: 'anthropic/claude-3-opus' },
						{ id: 'anthropic/claude-3-sonnet' },
						{ id: 'meta/llama-3-70b' },
						{ id: 'mistral/mistral-large' },
						{ id: 'cohere/command-r-plus' },
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

	it('should initialize OpenAI with correct credentials', async () => {
		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://test-truefoundry.com/v1',
				apiKey: 'test-api-key',
				fetchOptions: {
					dispatcher: {},
				},
			}),
		);
	});

	it('should return all models from TrueFoundry API', async () => {
		const result = await searchModels.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'anthropic/claude-3-opus', value: 'anthropic/claude-3-opus' },
			{ name: 'anthropic/claude-3-sonnet', value: 'anthropic/claude-3-sonnet' },
			{ name: 'cohere/command-r-plus', value: 'cohere/command-r-plus' },
			{ name: 'meta/llama-3-70b', value: 'meta/llama-3-70b' },
			{ name: 'mistral/mistral-large', value: 'mistral/mistral-large' },
			{ name: 'openai/gpt-3.5-turbo', value: 'openai/gpt-3.5-turbo' },
			{ name: 'openai/gpt-4', value: 'openai/gpt-4' },
		]);
	});

	it('should include custom headers when configured in credentials', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://test-truefoundry.com/v1',
			header: true,
			headerName: 'X-Custom-Header',
			headerValue: 'custom-value',
		});

		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://test-truefoundry.com/v1',
				apiKey: 'test-api-key',
				defaultHeaders: {
					'X-Custom-Header': 'custom-value',
				},
			}),
		);
	});

	it('should not include custom headers when header is false', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://test-truefoundry.com/v1',
			header: false,
			headerName: 'X-Custom-Header',
			headerValue: 'custom-value',
		});

		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.not.objectContaining({
				defaultHeaders: expect.anything(),
			}),
		);
	});

	it('should filter models based on search term', async () => {
		const result = await searchModels.call(mockContext, 'openai');

		expect(result.results).toEqual([
			{ name: 'openai/gpt-3.5-turbo', value: 'openai/gpt-3.5-turbo' },
			{ name: 'openai/gpt-4', value: 'openai/gpt-4' },
		]);
	});

	it('should handle case-insensitive search', async () => {
		const result = await searchModels.call(mockContext, 'ANTHROPIC');

		expect(result.results).toEqual([
			{ name: 'anthropic/claude-3-opus', value: 'anthropic/claude-3-opus' },
			{ name: 'anthropic/claude-3-sonnet', value: 'anthropic/claude-3-sonnet' },
		]);
	});

	it('should return models sorted alphabetically by id', async () => {
		// Setup a mock with scrambled order
		const mockUnsortedInstance = {
			apiKey: 'test-api-key',
			models: {
				list: jest.fn().mockResolvedValue({
					data: [
						{ id: 'z-provider/z-model' },
						{ id: 'a-provider/a-model' },
						{ id: 'openai/gpt-4' },
						{ id: 'anthropic/claude-3-sonnet' },
						{ id: 'meta/llama-3-70b' },
					],
				}),
			},
		} as unknown as OpenAI;

		(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockUnsortedInstance);

		const result = await searchModels.call(mockContext);

		// Verify the results are sorted alphabetically
		expect(result.results).toEqual([
			{ name: 'a-provider/a-model', value: 'a-provider/a-model' },
			{ name: 'anthropic/claude-3-sonnet', value: 'anthropic/claude-3-sonnet' },
			{ name: 'meta/llama-3-70b', value: 'meta/llama-3-70b' },
			{ name: 'openai/gpt-4', value: 'openai/gpt-4' },
			{ name: 'z-provider/z-model', value: 'z-provider/z-model' },
		]);
	});

	it('should return empty array when no models match filter', async () => {
		const result = await searchModels.call(mockContext, 'nonexistent');

		expect(result.results).toEqual([]);
	});

	it('should handle empty models list', async () => {
		const mockEmptyInstance = {
			apiKey: 'test-api-key',
			models: {
				list: jest.fn().mockResolvedValue({
					data: [],
				}),
			},
		} as unknown as OpenAI;

		(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockEmptyInstance);

		const result = await searchModels.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should include all models without filtering (unlike OpenAI)', async () => {
		const mockOpenAIInstance = {
			apiKey: 'test-api-key',
			models: {
				list: jest.fn().mockResolvedValue({
					data: [
						{ id: 'custom-model-1' },
						{ id: 'custom-model-2' },
						{ id: 'any-provider/any-model' },
						{ id: 'test-model' },
					],
				}),
			},
		} as unknown as OpenAI;

		(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIInstance);

		const result = await searchModels.call(mockContext);

		// All models should be included
		expect(result.results).toEqual([
			{ name: 'any-provider/any-model', value: 'any-provider/any-model' },
			{ name: 'custom-model-1', value: 'custom-model-1' },
			{ name: 'custom-model-2', value: 'custom-model-2' },
			{ name: 'test-model', value: 'test-model' },
		]);
		expect(result.results).toHaveLength(4);
	});

	it('should handle partial filter matches', async () => {
		const result = await searchModels.call(mockContext, 'claude');

		expect(result.results).toEqual([
			{ name: 'anthropic/claude-3-opus', value: 'anthropic/claude-3-opus' },
			{ name: 'anthropic/claude-3-sonnet', value: 'anthropic/claude-3-sonnet' },
		]);
	});

	it('should not include defaultHeaders when headerName is missing', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://test-truefoundry.com/v1',
			header: true,
			headerName: '', // Empty headerName
			headerValue: 'custom-value',
		});

		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.not.objectContaining({
				defaultHeaders: expect.anything(),
			}),
		);
	});

	it('should not include defaultHeaders when header field is not set', async () => {
		mockContext.getCredentials.mockResolvedValueOnce({
			apiKey: 'test-api-key',
			url: 'https://test-truefoundry.com/v1',
			headerName: 'X-Custom-Header',
			headerValue: 'custom-value',
		});

		await searchModels.call(mockContext);

		expect(mockOpenAI).toHaveBeenCalledWith(
			expect.not.objectContaining({
				defaultHeaders: expect.anything(),
			}),
		);
	});
});
