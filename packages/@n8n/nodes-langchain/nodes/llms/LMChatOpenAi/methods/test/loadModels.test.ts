import { getProxyAgent } from '@n8n/ai-utilities';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import OpenAI from 'openai';

import { searchModels } from '../loadModels';

jest.mock('openai');
jest.mock('@n8n/ai-utilities');

const MockedOpenAI = jest.mocked(OpenAI);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

describe('LMChatOpenAi - searchModels', () => {
	let mockContext: Partial<ILoadOptionsFunctions>;
	const { openAiDefaultHeaders } = Container.get(AiConfig);

	beforeEach(() => {
		jest.clearAllMocks();

		mockContext = {
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn(),
		};

		// Mock getProxyAgent
		mockedGetProxyAgent.mockReturnValue(undefined as any);

		// Setup default OpenAI mock
		const mockModels = {
			data: [
				{ id: 'gpt-4o' },
				{ id: 'gpt-4o-mini' },
				{ id: 'gpt-3.5-turbo' },
				{ id: 'davinci-002' }, // Should be filtered for OpenAI API
			],
		};

		MockedOpenAI.mockImplementation(() => ({
			models: {
				list: jest.fn().mockResolvedValue(mockModels),
			},
		}) as any);
	});

	describe('custom headers with static values', () => {
		it('should successfully load models when custom header has static value', async () => {
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-custom-header',
				headerValue: 'static-value',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			const result = await searchModels.call(mockContext as ILoadOptionsFunctions);

			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					baseURL: 'https://api.openai.com/v1',
					defaultHeaders: {
						...openAiDefaultHeaders,
						'x-custom-header': 'static-value',
					},
				}),
			);

			expect(result.results).toHaveLength(3);
			expect(result.results.map((r) => r.value)).toEqual([
				'gpt-3.5-turbo',
				'gpt-4o',
				'gpt-4o-mini',
			]);
		});

		it('should successfully load models when custom header has comma-separated values', async () => {
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-custom-header',
				headerValue: '1,2,3',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			const result = await searchModels.call(mockContext as ILoadOptionsFunctions);

			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					baseURL: 'https://api.openai.com/v1',
					defaultHeaders: {
						...openAiDefaultHeaders,
						'x-custom-header': '1,2,3',
					},
				}),
			);

			expect(result.results).toHaveLength(3);
		});
	});

	describe('custom headers with expressions - BUG REPRODUCTION', () => {
		it('BUG: expressions in custom headers are NOT evaluated, breaking model list loading', async () => {
			/**
			 * This test reproduces GHC-7479:
			 * When a custom header contains an n8n expression (e.g., {{$workflow.id}}),
			 * the expression is passed raw to the OpenAI API instead of being evaluated.
			 *
			 * Expected behavior: Either skip the header during model loading, or evaluate it
			 * Actual behavior: Raw expression "{{$workflow.id}}" is sent to OpenAI API
			 * Result: The API request fails, model dropdown shows "Could not load list"
			 */
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-workflow-id',
				headerValue: '{{$workflow.id}}',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			await searchModels.call(mockContext as ILoadOptionsFunctions);

			// BUG: The raw expression is passed to OpenAI instead of being evaluated or skipped
			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					defaultHeaders: expect.objectContaining({
						'x-workflow-id': '{{$workflow.id}}', // This should NOT be sent as-is!
					}),
				}),
			);

			// In production, this would cause the OpenAI API to reject the request
			// because {{$workflow.id}} is not a valid header value, breaking the model dropdown
		});

		it('BUG: complex expressions with multiple placeholders also break model loading', async () => {
			/**
			 * This test demonstrates the bug with more complex expressions.
			 * The UI shows the expression preview correctly resolved, but the model
			 * list still fails to load because the raw expression is sent to the API.
			 */
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-metadata',
				headerValue: 'n8n-workflow-id:{{$workflow.id}},n8n-workflow-name:{{$workflow.name}}',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			await searchModels.call(mockContext as ILoadOptionsFunctions);

			// BUG: The entire expression with multiple placeholders is sent raw
			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					defaultHeaders: expect.objectContaining({
						'x-metadata':
							'n8n-workflow-id:{{$workflow.id}},n8n-workflow-name:{{$workflow.name}}',
					}),
				}),
			);
		});

		it('should NOT send custom headers with expressions to avoid API errors (DESIRED BEHAVIOR)', async () => {
			/**
			 * This test documents the DESIRED behavior:
			 * When custom headers contain expressions, they should either be:
			 * 1. Omitted from the model list request (preferred)
			 * 2. Evaluated if possible (not feasible in ILoadOptionsFunctions context)
			 *
			 * This test is currently EXPECTED TO FAIL - it will pass once the bug is fixed.
			 */
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-workflow-id',
				headerValue: '{{$workflow.id}}',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			await searchModels.call(mockContext as ILoadOptionsFunctions);

			// DESIRED: Custom header with expression should be omitted from the request
			const openAICall = MockedOpenAI.mock.calls[0][0];
			expect(openAICall.defaultHeaders).not.toHaveProperty('x-workflow-id');

			// Alternative fix: Could check if the value doesn't contain '{{'
			// expect(openAICall.defaultHeaders['x-workflow-id']).not.toContain('{{');
		});
	});

	describe('model filtering', () => {
		it('should filter models correctly for OpenAI API', async () => {
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			const result = await searchModels.call(mockContext as ILoadOptionsFunctions);

			// Should exclude davinci-002 (non-chat model)
			expect(result.results.map((r) => r.value)).toEqual([
				'gpt-3.5-turbo',
				'gpt-4o',
				'gpt-4o-mini',
			]);
		});

		it('should filter models by search term', async () => {
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			const result = await searchModels.call(mockContext as ILoadOptionsFunctions, 'mini');

			expect(result.results).toHaveLength(1);
			expect(result.results[0].value).toBe('gpt-4o-mini');
		});

		it('should include all models for custom API endpoints', async () => {
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://custom-openai.example.com/v1',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			const mockCustomModels = {
				data: [
					{ id: 'custom-model-1' },
					{ id: 'custom-model-2' },
					{ id: 'davinci-002' }, // Should be included for custom endpoints
				],
			};

			MockedOpenAI.mockImplementation(() => ({
				models: {
					list: jest.fn().mockResolvedValue(mockCustomModels),
				},
			}) as any);

			const result = await searchModels.call(mockContext as ILoadOptionsFunctions);

			expect(result.results).toHaveLength(3);
			expect(result.results.map((r) => r.value)).toEqual([
				'custom-model-1',
				'custom-model-2',
				'davinci-002',
			]);
		});
	});

	describe('baseURL handling', () => {
		it('should use baseURL from node parameter', async () => {
			const customBaseURL = 'https://custom-api.example.com/v1';

			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
			});

			(mockContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.baseURL') return customBaseURL;
				return '';
			});

			await searchModels.call(mockContext as ILoadOptionsFunctions);

			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					baseURL: customBaseURL,
				}),
			);
		});

		it('should use baseURL from credentials when node parameter is empty', async () => {
			const customURL = 'https://credentials-api.example.com/v1';

			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
				url: customURL,
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			await searchModels.call(mockContext as ILoadOptionsFunctions);

			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					baseURL: customURL,
				}),
			);
		});

		it('should fall back to default OpenAI URL when neither is set', async () => {
			(mockContext.getCredentials as jest.Mock).mockResolvedValue({
				apiKey: 'test-api-key',
			});

			(mockContext.getNodeParameter as jest.Mock).mockReturnValue('');

			await searchModels.call(mockContext as ILoadOptionsFunctions);

			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					baseURL: 'https://api.openai.com/v1',
				}),
			);
		});
	});
});
