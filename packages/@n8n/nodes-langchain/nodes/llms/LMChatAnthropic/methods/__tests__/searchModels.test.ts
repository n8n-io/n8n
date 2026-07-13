import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { searchModels } from '../searchModels';

const mockModels = [
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

describe('searchModels', () => {
	let mockContext: Mocked<ILoadOptionsFunctions>;
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockContext = {
			getCredentials: vi.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
		} as unknown as Mocked<ILoadOptionsFunctions>;

		fetchSpy = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ data: mockModels }),
			text: async () => '',
		});
		vi.stubGlobal('fetch', fetchSpy);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('should fetch models from default Anthropic API URL when no custom URL is provided', async () => {
		const result = await searchModels.call(mockContext);

		expect(mockContext.getCredentials).toHaveBeenCalledWith('anthropicApi');
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.anthropic.com/v1/models',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-api-key': 'test-api-key',
					'anthropic-version': '2023-06-01',
				}),
			}),
		);
		expect(result.results).toHaveLength(5);
	});

	it('should fetch models from custom Anthropic API URL when provided in credentials', async () => {
		const customUrl = 'https://custom-anthropic-api.example.com';
		mockContext.getCredentials = vi
			.fn()
			.mockResolvedValue({ apiKey: 'test-api-key', url: customUrl });

		const result = await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(`${customUrl}/v1/models`, expect.anything());
		expect(result.results).toHaveLength(5);
	});

	it('should use default URL when empty URL is provided in credentials', async () => {
		mockContext.getCredentials = vi
			.fn()
			.mockResolvedValue({ apiKey: 'test-api-key', url: undefined });

		const result = await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith('https://api.anthropic.com/v1/models', expect.anything());
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

	it('should include the credential custom header in the request', async () => {
		mockContext.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			header: true,
			headerName: 'X-Gateway-Auth',
			headerValue: 'gateway-value',
		});

		await searchModels.call(mockContext);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.anthropic.com/v1/models',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-api-key': 'test-api-key',
					'X-Gateway-Auth': 'gateway-value',
				}),
			}),
		);
	});
});
