import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { searchModels } from '../loadModels';

// Mock OpenAI
jest.mock('openai');

// Mock utils
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn(),
}));

describe('LmChatZAi - loadModels', () => {
	let mockLoadOptionsFunctions: ILoadOptionsFunctions;

	beforeEach(() => {
		mockLoadOptionsFunctions = {
			getCredentials: jest.fn().mockResolvedValue({
				url: 'https://api.z.ai/v1',
				apiKey: 'test-api-key',
			}),
		} as unknown as ILoadOptionsFunctions;
	});

	it('should return filtered models', async () => {
		const mockModels = {
			data: [{ id: 'z-chat-v1' }, { id: 'z-chat-v2' }, { id: 'z-embedding-v1' }],
		};

		const mockOpenAI = {
			models: {
				list: jest.fn().mockResolvedValue(mockModels),
			},
		};

		require('openai').default = jest.fn().mockImplementation(() => mockOpenAI);

		const result = await searchModels.call(mockLoadOptionsFunctions);

		expect(result.results).toHaveLength(3);
		expect(result.results[0]).toEqual({ name: 'z-chat-v1', value: 'z-chat-v1' });
	});

	it('should filter models by search term', async () => {
		const mockModels = {
			data: [{ id: 'z-chat-v1' }, { id: 'z-chat-v2' }, { id: 'z-embedding-v1' }],
		};

		const mockOpenAI = {
			models: {
				list: jest.fn().mockResolvedValue(mockModels),
			},
		};

		require('openai').default = jest.fn().mockImplementation(() => mockOpenAI);

		const result = await searchModels.call(mockLoadOptionsFunctions, 'chat');

		expect(result.results).toHaveLength(2);
		expect(result.results.every((model) => model.name.includes('chat'))).toBe(true);
	});
});
