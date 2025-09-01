import type { ILoadOptionsFunctions } from 'n8n-workflow';
import OpenAI from 'openai';

import { searchModels } from '../loadModels';

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
				url: 'https://api.z.ai/api/paas/v4',
				apiKey: 'test-api-key',
			}),
			getNodeParameter: jest.fn().mockReturnValue(''),
		} as unknown as ILoadOptionsFunctions;
	});

	it('should return filtered models', async () => {
		const mockModels = {
			data: [{ id: 'glm-4.5' }, { id: 'glm-4.5-air' }, { id: 'embedding-3' }],
		};

		const mockOpenAI = {
			apiKey: 'test-api-key',
			organization: null,
			project: null,
			_options: {},
			models: {
				list: jest.fn().mockResolvedValue(mockModels),
			},
		} as unknown as OpenAI;

		(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

		const result = await searchModels.call(mockLoadOptionsFunctions);

		expect(result.results).toHaveLength(2);
		expect(result.results[0]).toEqual({ name: 'glm-4.5', value: 'glm-4.5' });
		expect(result.results[1]).toEqual({ name: 'glm-4.5-air', value: 'glm-4.5-air' });
	});

	it('should filter models by search term', async () => {
		const mockModels = {
			data: [{ id: 'glm-4.5' }, { id: 'glm-4.5-air' }, { id: 'embedding-3' }],
		};

		const mockOpenAI = {
			apiKey: 'test-api-key',
			organization: null,
			project: null,
			_options: {},
			models: {
				list: jest.fn().mockResolvedValue(mockModels),
			},
		} as unknown as OpenAI;

		(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

		const result = await searchModels.call(mockLoadOptionsFunctions, 'glm');

		expect(result.results).toHaveLength(2);
		expect(result.results.every((model) => model.name.includes('glm'))).toBe(true);
	});
});
