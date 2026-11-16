import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { LmOpenAi } from '../LmOpenAi.node';

describe('LmOpenAi', () => {
	describe('openAiModelSearch', () => {
		const searchModels = async (options: { baseURL?: string }) => {
			const context = mockDeep<ILoadOptionsFunctions>();
			context.getNode.mockReturnValue(mockDeep<INode>());
			context.getNodeParameter.mockReturnValue(options);
			context.getCredentials.mockResolvedValue({
				apiKey: 'sk-test',
				url: 'https://llm.example.com/v1',
			});
			context.helpers.requestWithAuthentication.mockResolvedValue({ data: [] });

			await new LmOpenAi().methods.listSearch.openAiModelSearch.call(context);

			const [, requestOptions] = context.helpers.requestWithAuthentication.mock.calls[0];
			return String(requestOptions.uri);
		};

		it('should request the default models URL', async () => {
			expect(await searchModels({})).toBe('https://api.openai.com/v1/models');
		});

		it('should request the models URL of the base URL', async () => {
			expect(await searchModels({ baseURL: 'https://llm.example.com/v1' })).toBe(
				'https://llm.example.com/v1/models',
			);
		});

		it('should remove a trailing slash from the base URL', async () => {
			expect(await searchModels({ baseURL: 'https://llm.example.com/v1/' })).toBe(
				'https://llm.example.com/v1/models',
			);
		});

		it('should reject a base URL with a query', async () => {
			await expect(searchModels({ baseURL: 'https://llm.example.com/v1?x=1' })).rejects.toThrow(
				'Invalid base URL',
			);
		});
	});
});
