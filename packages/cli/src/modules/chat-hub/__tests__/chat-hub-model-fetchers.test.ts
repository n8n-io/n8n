import type { ChatHubLLMProvider } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import type { INodeCredentials, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';

import {
	fetchLLMProviderModels,
	LLM_PROVIDER_FETCH_CONFIGS,
	type LLMProviderFetchConfig,
} from '../chat-hub-model-fetchers';
import { PROVIDER_NODE_TYPE_MAP } from '../chat-hub.constants';

describe('chat-hub-model-fetchers', () => {
	const nodeParametersService = mock<DynamicNodeParametersService>();
	const credentials: INodeCredentials = { testApi: { name: '', id: 'cred-1' } };
	const additionalData = mock<IWorkflowExecuteAdditionalData>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('LLM_PROVIDER_FETCH_CONFIGS', () => {
		it('should have a config for every ChatHubLLMProvider in PROVIDER_NODE_TYPE_MAP', () => {
			const expectedProviders = Object.keys(PROVIDER_NODE_TYPE_MAP);
			const configuredProviders = Object.keys(LLM_PROVIDER_FETCH_CONFIGS);
			expect(configuredProviders.sort()).toEqual(expectedProviders.sort());
		});
	});

	describe('fetchLLMProviderModels', () => {
		it('should return empty array for noop config', async () => {
			const config: LLMProviderFetchConfig = { type: 'noop' };

			const result = await fetchLLMProviderModels(
				config,
				'azureOpenAi',
				credentials,
				additionalData,
				nodeParametersService,
			);

			expect(result).toEqual([]);
			expect(nodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
			expect(nodeParametersService.getOptionsViaLoadOptions).not.toHaveBeenCalled();
		});

		it('should call getResourceLocatorResults for resourceLocator config', async () => {
			const config: LLMProviderFetchConfig = { type: 'resourceLocator' };
			const mockModels = [{ name: 'gpt-4', value: 'gpt-4' }];
			nodeParametersService.getResourceLocatorResults.mockResolvedValue({
				results: mockModels,
			});

			const result = await fetchLLMProviderModels(
				config,
				'openai',
				credentials,
				additionalData,
				nodeParametersService,
			);

			expect(result).toEqual(mockModels);
			expect(nodeParametersService.getResourceLocatorResults).toHaveBeenCalledWith(
				'searchModels',
				'parameters.model',
				additionalData,
				PROVIDER_NODE_TYPE_MAP.openai,
				{},
				credentials,
			);
		});

		it('should call getOptionsViaLoadOptions for loadOptions config', async () => {
			const config: LLMProviderFetchConfig = {
				type: 'loadOptions',
				routing: {
					request: { method: 'GET', url: '/models' },
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
					},
				},
			};
			const mockModels = [{ name: 'deepseek-chat', value: 'deepseek-chat' }];
			nodeParametersService.getOptionsViaLoadOptions.mockResolvedValue(mockModels);

			const result = await fetchLLMProviderModels(
				config,
				'deepSeek',
				credentials,
				additionalData,
				nodeParametersService,
			);

			expect(result).toEqual(mockModels);
			expect(nodeParametersService.getOptionsViaLoadOptions).toHaveBeenCalledWith(
				{ routing: config.routing },
				additionalData,
				PROVIDER_NODE_TYPE_MAP.deepSeek,
				{},
				credentials,
			);
		});

		it('should call getOptionsViaLoadOptions for each routing in loadOptionsMulti config and concatenate', async () => {
			const routing1 = {
				request: { method: 'GET' as const, url: '/foundation-models' },
				output: { postReceive: [] },
			};
			const routing2 = {
				request: { method: 'GET' as const, url: '/inference-profiles' },
				output: { postReceive: [] },
			};
			const config: LLMProviderFetchConfig = {
				type: 'loadOptionsMulti',
				routings: [routing1, routing2],
			};
			const foundationModels = [{ name: 'Titan', value: 'titan-v1' }];
			const inferenceModels = [{ name: 'Claude', value: 'anthropic.claude-v2' }];
			nodeParametersService.getOptionsViaLoadOptions
				.mockResolvedValueOnce(foundationModels)
				.mockResolvedValueOnce(inferenceModels);

			const result = await fetchLLMProviderModels(
				config,
				'awsBedrock',
				credentials,
				additionalData,
				nodeParametersService,
			);

			expect(result).toEqual([...foundationModels, ...inferenceModels]);
			expect(nodeParametersService.getOptionsViaLoadOptions).toHaveBeenCalledTimes(2);
			expect(nodeParametersService.getOptionsViaLoadOptions).toHaveBeenCalledWith(
				{ routing: routing1 },
				additionalData,
				PROVIDER_NODE_TYPE_MAP.awsBedrock,
				{},
				credentials,
			);
			expect(nodeParametersService.getOptionsViaLoadOptions).toHaveBeenCalledWith(
				{ routing: routing2 },
				additionalData,
				PROVIDER_NODE_TYPE_MAP.awsBedrock,
				{},
				credentials,
			);
		});

		it.each([
			['openai', 'resourceLocator'],
			['anthropic', 'resourceLocator'],
			['azureOpenAi', 'noop'],
			['azureEntraId', 'noop'],
			['awsBedrock', 'loadOptionsMulti'],
			['google', 'loadOptions'],
			['ollama', 'loadOptions'],
			['mistralCloud', 'loadOptions'],
			['cohere', 'loadOptions'],
			['deepSeek', 'loadOptions'],
			['openRouter', 'loadOptions'],
			['groq', 'loadOptions'],
			['xAiGrok', 'loadOptions'],
			['vercelAiGateway', 'loadOptions'],
		] as Array<[ChatHubLLMProvider, string]>)(
			'should have correct config type for %s (%s)',
			(provider, expectedType) => {
				expect(LLM_PROVIDER_FETCH_CONFIGS[provider].type).toBe(expectedType);
			},
		);
	});
});
