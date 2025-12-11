import type { ISupplyDataFunctions } from 'n8n-workflow';

import type { OpenAICompatibleCredential } from '../../types/types';
import { LmChatBurnCloud } from '../LmChatBurnCloud/LmChatBurnCloud.node';

describe('LmChatBurnCloud', () => {
	let node: LmChatBurnCloud;

	beforeEach(() => {
		node = new LmChatBurnCloud();
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI model with default parameters', async () => {
			const credentials: OpenAICompatibleCredential = {
				apiKey: 'test-api-key',
				url: 'https://ai.burncloud.com',
			};

			const getCredentialsMock = jest.fn().mockResolvedValue(credentials);
			const getNodeParameterMock = jest.fn(
				(parameterName: string, index: number, defaultValue?: never) => {
					if (parameterName === 'model') return 'deepseek-chat';
					if (parameterName === 'options') return { timeout: 360000, maxRetries: 2 };
					return defaultValue;
				},
			);

			const mockExecuteFunctions = {
				getCredentials: getCredentialsMock,
				getNodeParameter: getNodeParameterMock,
			} as unknown as ISupplyDataFunctions;

			const result = await node.supplyData.call(mockExecuteFunctions, 0);

			expect(result).toHaveProperty('response');
			expect(getCredentialsMock).toHaveBeenCalledWith('burnCloudApi');
		});

		it('should create ChatOpenAI model with custom parameters', async () => {
			const credentials: OpenAICompatibleCredential = {
				apiKey: 'test-api-key',
				url: 'https://ai.burncloud.com',
			};

			const options = {
				temperature: 0.8,
				maxTokens: 1000,
				topP: 0.9,
				frequencyPenalty: 0.5,
				presencePenalty: 0.5,
				timeout: 30000,
				maxRetries: 3,
				responseFormat: 'json_object',
			};

			const mockExecuteFunctions = {
				getCredentials: jest.fn().mockResolvedValue(credentials),
				getNodeParameter: jest.fn((parameterName: string, index: number, defaultValue?: never) => {
					if (parameterName === 'model') {
						return 'deepseek-chat';
					}
					if (parameterName === 'options') {
						return options;
					}
					return defaultValue;
				}),
			} as unknown as ISupplyDataFunctions;

			const result = await node.supplyData.call(mockExecuteFunctions, 0);

			expect(result).toHaveProperty('response');
		});

		it('should handle JSON response format correctly', async () => {
			const credentials: OpenAICompatibleCredential = {
				apiKey: 'test-api-key',
				url: 'https://ai.burncloud.com',
			};

			const options = {
				responseFormat: 'json_object',
				timeout: 360000,
				maxRetries: 2,
			};

			const mockExecuteFunctions = {
				getCredentials: jest.fn().mockResolvedValue(credentials),
				getNodeParameter: jest.fn((parameterName: string, index: number, defaultValue?: never) => {
					if (parameterName === 'model') {
						return 'deepseek-chat';
					}
					if (parameterName === 'options') {
						return options;
					}
					return defaultValue;
				}),
			} as unknown as ISupplyDataFunctions;

			const result = await node.supplyData.call(mockExecuteFunctions, 0);

			expect(result).toHaveProperty('response');
		});
	});
});
