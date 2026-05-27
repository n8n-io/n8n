import { AzureChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { setupApiKeyAuthentication } from '../LmChatAzureOpenAi/credentials/api-key';
import { LmChatAzureOpenAi } from '../LmChatAzureOpenAi/LmChatAzureOpenAi.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');
vi.mock('../LmChatAzureOpenAi/credentials/api-key');
vi.mock('../LmChatAzureOpenAi/credentials/oauth2');

const MockedAzureChatOpenAI = vi.mocked(AzureChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedSetupApiKeyAuthentication = vi.mocked(setupApiKeyAuthentication);

describe('LmChatAzureOpenAi', () => {
	let lmChatAzureOpenAi: LmChatAzureOpenAi;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Azure OpenAI Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatAzureOpenAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (options: Record<string, unknown> = {}) => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		mockContext.getNode = vi.fn().mockReturnValue(mockNode);
		mockContext.logger = {
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as ISupplyDataFunctions['logger'];

		const getNodeParameter = vi.fn((paramName: string) => {
			if (paramName === 'authentication') return 'azureOpenAiApi';
			if (paramName === 'model') return 'gpt-5';
			if (paramName === 'options') return options;
			return undefined;
		});
		mockContext.getNodeParameter =
			getNodeParameter as unknown as typeof mockContext.getNodeParameter;

		mockedSetupApiKeyAuthentication.mockResolvedValue({
			azureOpenAIApiKey: 'test-api-key',
			azureOpenAIApiInstanceName: 'test-resource',
			azureOpenAIApiVersion: '2024-02-01',
			azureOpenAIEndpoint: undefined,
		});
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as never);
		vi.mocked(N8nLlmTracing).mockClear();

		return mockContext;
	};

	beforeEach(() => {
		lmChatAzureOpenAi = new LmChatAzureOpenAi();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should expose a Reasoning Effort option', () => {
			const optionsCollection = lmChatAzureOpenAi.description.properties.find(
				(property) => property?.name === 'options',
			);
			const reasoningEffort = optionsCollection?.options?.find(
				(option) => 'name' in option && option.name === 'reasoningEffort',
			);

			expect(reasoningEffort).toMatchObject({
				name: 'reasoningEffort',
				type: 'options',
				default: 'medium',
			});
		});
	});

	describe('supplyData', () => {
		it('should not set modelKwargs when no relevant options are provided', async () => {
			const mockContext = setupMockContext({});

			await lmChatAzureOpenAi.supplyData.call(mockContext, 0);

			expect(MockedAzureChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'gpt-5',
					modelKwargs: undefined,
				}),
			);
		});

		it('should pass reasoning_effort to modelKwargs when set', async () => {
			const mockContext = setupMockContext({ reasoningEffort: 'high' });

			await lmChatAzureOpenAi.supplyData.call(mockContext, 0);

			expect(MockedAzureChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						reasoning_effort: 'high',
					},
				}),
			);
		});

		it('should pass both response_format and reasoning_effort when both are set', async () => {
			const mockContext = setupMockContext({
				responseFormat: 'json_object',
				reasoningEffort: 'low',
			});

			await lmChatAzureOpenAi.supplyData.call(mockContext, 0);

			expect(MockedAzureChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						response_format: { type: 'json_object' },
						reasoning_effort: 'low',
					},
				}),
			);
		});

		it('should ignore an invalid reasoning effort value', async () => {
			const mockContext = setupMockContext({ reasoningEffort: 'invalid' });

			await lmChatAzureOpenAi.supplyData.call(mockContext, 0);

			expect(MockedAzureChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should accept all valid reasoning effort values', async () => {
			const reasoningEffortValues = ['low', 'medium', 'high'] as const;

			for (const effort of reasoningEffortValues) {
				const mockContext = setupMockContext({ reasoningEffort: effort });

				await lmChatAzureOpenAi.supplyData.call(mockContext, 0);

				expect(MockedAzureChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: {
							reasoning_effort: effort,
						},
					}),
				);

				vi.clearAllMocks();
			}
		});
	});
});
