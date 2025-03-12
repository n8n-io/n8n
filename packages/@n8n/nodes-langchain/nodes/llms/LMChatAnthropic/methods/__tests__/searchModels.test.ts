import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchModels, type AnthropicModel } from '../searchModels';

describe('searchModels', () => {
	let mockContext: jest.Mocked<ILoadOptionsFunctions>;

	const mockModels: AnthropicModel[] = [
		{
			id: 'claude-3-opus-20240229',
			display_name: 'Claude 3 Opus',
			type: 'model',
			created_at: '2024-02-29T00:00:00Z',
		},
		{
			id: 'claude-3-sonnet-20240229',
			display_name: 'Claude 3 Sonnet',
			type: 'model',
			created_at: '2024-02-29T00:00:00Z',
		},
		{
			id: 'claude-3-haiku-20240307',
			display_name: 'Claude 3 Haiku',
			type: 'model',
			created_at: '2024-03-07T00:00:00Z',
		},
		{
			id: 'claude-2.1',
			display_name: 'Claude 2.1',
			type: 'model',
			created_at: '2023-11-21T00:00:00Z',
		},
		{
			id: 'claude-2.0',
			display_name: 'Claude 2.0',
			type: 'model',
			created_at: '2023-07-11T00:00:00Z',
		},
	];

	beforeEach(() => {
		mockContext = {
			helpers: {
				httpRequestWithAuthentication: jest.fn().mockResolvedValue({
					data: mockModels,
				}),
			},
		} as unknown as jest.Mocked<ILoadOptionsFunctions>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should fetch models from Anthropic API', async () => {
		const result = await searchModels.call(mockContext);

		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('anthropicApi', {
			url: 'https://api.anthropic.com/v1/models',
			headers: {
				'anthropic-version': '2023-06-01',
			},
		});
		expect(result.results).toHaveLength(5);
	});

	it('should sort models by created_at date, most recent first', async () => {
		const result = await searchModels.call(mockContext);
		const sortedResults = result.results;

		expect(sortedResults[0].value).toBe('claude-3-haiku-20240307');
		expect(sortedResults[1].value).toBe('claude-3-opus-20240229');
		expect(sortedResults[2].value).toBe('claude-3-sonnet-20240229');
		expect(sortedResults[3].value).toBe('claude-2.1');
		expect(sortedResults[4].value).toBe('claude-2.0');
	});

	it('should filter models based on search term', async () => {
		const result = await searchModels.call(mockContext, 'claude-3');

		expect(result.results).toHaveLength(3);
		expect(result.results).toEqual([
			{ name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
			{ name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
			{ name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
		]);
	});

	it('should handle case-insensitive search', async () => {
		const result = await searchModels.call(mockContext, 'CLAUDE-3');

		expect(result.results).toHaveLength(3);
		expect(result.results).toEqual([
			{ name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
			{ name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
			{ name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
		]);
	});

	it('should handle when no models match the filter', async () => {
		const result = await searchModels.call(mockContext, 'nonexistent-model');

		expect(result.results).toHaveLength(0);
	});
});
